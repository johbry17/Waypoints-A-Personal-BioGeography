#!/usr/bin/env python3
"""extract_data.py

Convert the notebook `resources/extract_data.ipynb` into a runnable script.
Functions: overview, activity, location, routes. Saves JSON/CSV outputs and
optionally updates Google Sheets.
"""

# standard library imports
from pathlib import Path
import argparse
import json
import logging
import uuid
import sys
from time import sleep

# third-party imports
import pandas as pd
import geojson
from geographiclib.geodesic import Geodesic

# imports for Google Sheets
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    from gspread_dataframe import set_with_dataframe
except Exception:
    # if not installed, Google Sheets operations will be skipped
    gspread = None

# imports for geocoding and routing (geopy and openrouteservice)
from geopy.geocoders import Nominatim
import openrouteservice

# local module for manual locations mapping
from manual_locations import LOCATIONS

# constants for file paths
ROOT = Path(__file__).resolve().parent.parent
DOCS_DATA = ROOT / "docs" / "resources" / "data"
DOCS_GEOJSON = ROOT / "docs" / "resources" / "geojson"
CACHE_GEOCODE = ROOT / "scripts" / "geocode_cache.json"
CACHE_GEOCODE_ROUTES = ROOT / "scripts" / "geocode_cache_routes.json"


###############################################################################
# General Utilities
###############################################################################


def setup_logging(level=logging.INFO):
    """Configure root logger with a standard timestamp format."""
    # format: timestamp, log level, message
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def load_api_keys(path: Path = ROOT / "scripts" / "api_keys.json"):
    """Load and return API keys from *path*.

    Logs a warning and returns an empty dict if the file is absent.
    """
    # load API keys from a JSON file; return as a dictionary
    if not path.exists():
        logging.warning("api_keys.json not found — some features may be disabled")
        return {}
    with open(path) as f:
        return json.load(f)


def ensure_uuid_series(series):
    """Return a list mirroring *series* with blank/NaN entries replaced by new UUIDs.

    Existing IDs are preserved so repeated script runs do not regenerate identifiers.
    """
    vals = []
    for v in series:
        # missing or empty values are replaced with a new UUID
        if pd.isna(v) or v == "":
            vals.append(str(uuid.uuid4()))
        # otherwise keep it (never overwrite existing IDs)
        else:
            vals.append(v)
    return vals


def load_cache(path: Path):
    """Load a JSON cache from *path*, returning an empty dict if absent or unreadable."""
    # load persistent cache to avoid repeated geocoding requests across script runs
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            # over-broad catch-all for any issues reading/parsing the cache file
            logging.warning("Failed to read cache %s", path)
    return {}


def save_cache(data, path: Path):
    """Persist *data* to *path* as JSON, logging a warning on failure."""
    # save the persistent cache to avoid repeated geocoding requests across script runs
    try:
        with open(path, "w") as f:
            json.dump(data, f)
    except Exception as e:
        # over-broad catch-all for any issues writing the cache file
        logging.warning("Failed to write cache %s: %s", path, e)


###############################################################################
# Google Sheets
###############################################################################


def auth_google_sheets(creds_path: Path, key: str):
    """Authenticate with Google Sheets and return the spreadsheet for *key*.

    Returns None if gspread is unavailable.
    """
    if gspread is None:
        # gspread not installed; cannot authenticate; skip Google Sheets operations
        logging.warning("gspread not installed or failed to import")
        return None
    # OAuth scopes required to read/write Google Sheets
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(creds_path), scope)
    client = gspread.authorize(creds)
    # return the spreadsheet object corresponding to the provided key
    return client.open_by_key(key)


###############################################################################
# Overview
###############################################################################


def parse_photo_list(value):
    """Split a comma-separated photo string into a list of stripped filenames."""
    if isinstance(value, str) and value.strip():
        return [item.strip() for item in value.split(",")]
    return []


def parse_zoom_bounds(value):
    """Parse a JSON string into a zoom-bounds dict, returning None if absent or invalid."""
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logging.debug("Invalid zoomBounds format: %s", value)
    return None  # if parsing fails or value is empty


def process_overview(sheet):
    """Read the Overview worksheet, clean photo and zoomBounds fields, and write overview.json."""
    logging.info("Processing Overview sheet...")
    overview_data = sheet.get_all_records()
    # convert photo and zoomBounds strings stored in Google Sheets into proper Python lists/dicts
    for entry in overview_data:
        raw_photos = entry.get("photos", "")
        entry["photos"] = [p.strip("[]\"' ") for p in parse_photo_list(raw_photos)]
        raw_zoom = entry.get("zoomBounds", "")
        entry["zoomBounds"] = parse_zoom_bounds(raw_zoom)

    # save the processed overview data as a JSON file in the designated output directory
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "overview.json"
    with open(out, "w", encoding="utf8") as fh:
        # indent=2 for readability, ensure_ascii=False to preserve non-ASCII characters
        json.dump(overview_data, fh, indent=2, ensure_ascii=False)
    logging.info("Wrote %s", out)


###############################################################################
# Activity & Location
###############################################################################


def geocode_with_nominatim(geolocator, cache, location_name, sleep_time=1):
    """Return (lat, lng) for *location_name* via Nominatim with in-memory caching
    to avoid repeated requests.

    Sleeps *sleep_time* seconds after each live request to respect rate limits.
    Returns (None, None) if geocoding fails.
    """
    if not location_name:
        # guard clause
        return None, None
    # return cached coordinates if available (Nominatim has rate limits)
    if location_name in cache:
        lat, lng = cache[location_name]["lat"], cache[location_name]["lng"]
        return lat, lng
    try:
        loc = geolocator.geocode(location_name)
        # update the cache and return the coordinates if found
        if loc:
            cache[location_name] = {"lat": loc.latitude, "lng": loc.longitude}
            sleep(
                sleep_time
            )  # for Nominatim rate limits, sleep a bit after each request
            return loc.latitude, loc.longitude
        logging.warning("No lat/lng for %s", location_name)
    except Exception as e:
        # over-broad catch-all for any geocoding errors (network issues, rate limits, etc.)
        logging.warning("Geocoding failed for %s: %s", location_name, e)
    return None, None  # if geocoding fails


def format_photos_column(series):
    """Parse a Series of raw photo strings into lists of clean filenames."""

    def _fmt(v):
        if isinstance(v, str) and v.strip():
            try:
                # attempt to parse the string as JSON
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    # ensure all items are strings and strip whitespace and quotes
                    return [str(x).strip(" \"'[]") for x in parsed]
            except Exception:
                # if parsing fails, split the string manually
                return [x.strip(" \"'[]") for x in v.split(",")]
        return []  # empty list if invalid or empty

    return series.apply(_fmt)


def process_activity(sheet, upload=True, geolocator=None):
    """Load the Activity worksheet, assign UUIDs, geocode missing coordinates, format photos, and write activity.json.

    Optionally uploads the enriched DataFrame back to Google Sheets when *upload* is True.
    Returns the processed DataFrame for use by process_routes.
    """
    logging.info("Processing Activity sheet...")
    records = sheet.get_all_records()
    df = pd.DataFrame(records)
    if "activity_id" not in df.columns:  # overly defensive for a personal project
        df["activity_id"] = ""
    df["activity_id"] = ensure_uuid_series(df["activity_id"])  # add IDs if missing

    # load cache of lat/lng and initialize geolocator if not provided
    cache = load_cache(CACHE_GEOCODE)
    if geolocator is None:
        # Nominatim requires a descriptive user_agent per its usage policy
        geolocator = Nominatim(user_agent="waypoints_extract", timeout=10)

    for idx, row in df.iterrows():
        lat = row.get("lat")
        lng = row.get("lng")
        # if missing or NaN, attempt to geocode using the location name
        if not lat or not lng or pd.isna(lat) or pd.isna(lng):
            location_name = row.get("location")
            logging.info("Geocoding Activity %s (%s)", row.get("name"), location_name)
            glat, glng = geocode_with_nominatim(geolocator, cache, location_name)
            df.at[idx, "lat"] = glat
            df.at[idx, "lng"] = glng

    save_cache(cache, CACHE_GEOCODE)

    # format the photos column to ensure it's a list of cleaned photo filenames for web display
    df["photos"] = format_photos_column(df.get("photos", pd.Series([""] * len(df))))

    # save the processed activity data as a JSON file in the designated output directory
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "activity.json"
    df.to_json(out, orient="records", indent=2, force_ascii=False)
    logging.info("Wrote %s", out)

    # should we upload to Google Sheets, and can we upload?
    if upload and gspread is not None:
        logging.info("Uploading Activity back to Google Sheets")
        df_upload = df.fillna("")  # for Google Sheets compatibility
        try:
            set_with_dataframe(sheet, df_upload)
            logging.info("Activity sheet updated")
        except Exception as e:
            logging.warning("Failed to upload Activity sheet: %s", e)

    # return the processed DataFrame for use in routes processing
    return df


def process_location(sheet, upload=True, geolocator=None):
    """Load the Location worksheet, assign UUIDs, geocode missing coordinates, format photos, and write location.json.

    Optionally uploads the enriched DataFrame back to Google Sheets when *upload* is True.
    """
    # yes, it's the same as process_activity, left for clarity and potential future divergence
    logging.info("Processing Location sheet...")
    records = sheet.get_all_records()
    df = pd.DataFrame(records)
    if "location_id" not in df.columns:  # overly defensive for a personal project
        df["location_id"] = ""
    df["location_id"] = ensure_uuid_series(df["location_id"])  # add IDs if missing

    # load cache of lat/lng and initialize geolocator if not provided
    cache = load_cache(CACHE_GEOCODE)
    if geolocator is None:
        # Nominatim requires a descriptive user_agent per its usage policy
        geolocator = Nominatim(user_agent="waypoints_extract", timeout=10)

    for idx, row in df.iterrows():
        lat = row.get("lat")
        lng = row.get("lng")
        # if missing or NaN, attempt to geocode using the location name
        if not lat or not lng or pd.isna(lat) or pd.isna(lng):
            location_name = row.get("location")
            logging.info("Geocoding Location %s", location_name)
            glat, glng = geocode_with_nominatim(geolocator, cache, location_name)
            df.at[idx, "lat"] = glat
            df.at[idx, "lng"] = glng

    save_cache(cache, CACHE_GEOCODE)

    # format the photos column to ensure it's a list of cleaned photo filenames for web display
    df["photos"] = format_photos_column(df.get("photos", pd.Series([""] * len(df))))

    # save the processed location data as a JSON file in the designated output directory
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "location.json"
    df.to_json(out, orient="records", indent=2, force_ascii=False)
    logging.info("Wrote %s", out)

    # should we upload to Google Sheets, and can we upload?
    if upload and gspread is not None:
        logging.info("Uploading Location back to Google Sheets")
        df_upload = df.fillna("")  # for Google Sheets compatibility
        try:
            set_with_dataframe(sheet, df_upload)
            logging.info("Location sheet updated")
        except Exception as e:
            logging.warning("Failed to upload Location sheet: %s", e)

    # return the processed DataFrame,
    # in theory for use in other processing, really for consistency with process_activity
    return df


###############################################################################
# Route Helpers
###############################################################################


def calculate_great_circle(start_coords, end_coords, num_points=100):
    """Return a list of (lon, lat) points along the WGS84 great-circle path between two locations.

    Handles antimeridian crossing by shifting longitudes so the resulting
    LineString does not wrap across the map.

    Args:
        start_coords: (lat, lon) of the start point.
        end_coords: (lat, lon) of the end point.
        num_points: number of intermediate sample points.
    """
    geod = (
        Geodesic.WGS84
    )  # WGS84 coordinate reference system (CRS) is the standard for GPS / GIS
    # create invisible line between start and end coordinates to calculate intermediate points
    line = geod.InverseLine(
        start_coords[0],
        start_coords[1],
        end_coords[0],
        end_coords[1],  # lat1, lon1, lat2, lon2
    )
    # generate points along the line at equal intervals
    points = []
    for i in range(num_points + 1):
        s = i * line.s13 / num_points  # line.s13 = total distance between start and end
        position = line.Position(s)  # get the position at distance s along the line
        lon, lat = (
            position["lon2"],
            position["lat2"],
        )
        # handle crossing the International Date Line
        if points and abs(lon - points[-1][0]) > 180:
            if lon > 0:
                lon -= 360  # shift longitude from +180 to -180
            else:
                lon += 360  # shift longitude from -180 to +180
        points.append((lon, lat))  # (longitude, latitude) for geojson LineString
    return points


def save_great_circle_as_geojson(route_coords, output_file):
    """Write a GeoJSON FeatureCollection with a single LineString to *output_file*.

    The feature's ``transport_mode`` property is set to ``"plane"``.
    """
    feature = geojson.Feature(
        # creates a GIS Feature (with LineString geometry and metadata properties)
        geometry=geojson.LineString(route_coords),
        properties={"transport_mode": "plane"},
    )
    # wrap the feature in a FeatureCollection for GeoJSON compliance
    fc = geojson.FeatureCollection([feature])
    with open(output_file, "w", encoding="utf8") as f:
        geojson.dump(fc, f)
    logging.info("Saved great circle %s", output_file)


def geocode_route_location_ors(ors_client, cache, location):
    """Return (lon, lat) for *location* via ORS Pelias search, with cache
    to avoid repeated requests.

    Returns (None, None) on failure.
    """
    if location in cache:
        return cache[location]
    try:
        # call the ORS Pelias search API to get coordinates for the location
        res = ors_client.pelias_search(text=location)
        if res.get("features"):
            coords = res["features"][0]["geometry"]["coordinates"]
            cache[location] = (coords[0], coords[1])  # store (lon, lat) in cache
            return coords[0], coords[1]  # return (lon, lat) for ORS
    except Exception as e:
        logging.warning("ORS geocode failed for %s: %s", location, e)
    return None, None


def fetch_route_ors(ors_client, start_coords, end_coords, transport_mode):
    """Request a driving route from the ORS Directions API and return the GeoJSON response.

    Maps ``"train"`` to the ``driving-car`` profile (ORS has no train support).
    Returns None on failure.
    """
    try:
        # translate transport mode to ORS's API profile names;
        # train is not supported (must be manually routed), so defaults to driving-car in interim;
        # default to driving-car if unknown
        profile = {"auto": "driving-car", "train": "driving-car"}.get(
            transport_mode, "driving-car"
        )
        # call the ORS Directions API to get the route as GeoJSON
        r = ors_client.directions(
            coordinates=[start_coords, end_coords], profile=profile, format="geojson"
        )
        return r
    except Exception as e:
        logging.warning("ORS directions failed: %s", e)
    return None


###############################################################################
# Routes
###############################################################################


def process_routes(
    sheet, activity_df, upload=True, manual_locations=None, api_keys=None
):
    """Build, geocode, and export all route geometries to GeoJSON and routes.csv.

    - Hiking routes from *activity_df* are added if not already present.
    - Existing filenames are skipped to avoid overwriting manual edits.
    - Flights are rendered as great-circle arcs; driving/train routes use ORS Directions.
    - Optionally uploads the updated DataFrame back to Google Sheets when *upload* is True.
    """
    logging.info("Processing Routes sheet...")
    df = pd.DataFrame(sheet.get_all_records())

    # add hikes from activities that have a route_path
    for _, a in activity_df.iterrows():
        route_path = a.get("route_path")
        # if not already in df, add a new row for the hike
        if (
            a.get("activity_type") == "hiking"
            and route_path
            and route_path not in df["filename"].values
        ):
            new = {
                "start_location": a.get("name"),
                "end_location": a.get("name"),
                "transport_mode": "hike",
                "filename": route_path,
            }
            df = pd.concat([df, pd.DataFrame([new])], ignore_index=True)

    # add IDs if missing
    if "route_id" not in df.columns:  # overly defensive for a personal project
        df["route_id"] = ""
    df["route_id"] = ensure_uuid_series(df["route_id"])

    # load cache of geocoded routes (start/end locations) to avoid repeated requests
    CACHE_ROUTES = load_cache(CACHE_GEOCODE_ROUTES)

    # prepare ORS client if possible (for auto/train routes)
    ors_client = None
    if api_keys and api_keys.get("openrouteservice"):
        try:
            ors_client = openrouteservice.Client(key=api_keys["openrouteservice"])
        except Exception:
            logging.warning("Failed to init openrouteservice client")

    # use manual locations mapping if provided; otherwise, default to empty dict
    manual_locations = manual_locations or {}

    # process start/end locations and fetch routes
    for idx, row in df.iterrows():
        filename = str(row.get("filename") or "").strip()
        # guard clause; skip extant routes to avoid overwriting
        if filename:
            continue
        # get transport mode, start and end locations from the row
        mode = str(row.get("transport_mode") or "").lower()
        start = row.get("start_location")
        end = row.get("end_location")

        # geocode start/end using manual map first
        start_coords = manual_locations.get(start)
        end_coords = manual_locations.get(end)

        # if not found in manual map, try ORS geocoding
        if not start_coords and ors_client:
            start_coords = geocode_route_location_ors(ors_client, CACHE_ROUTES, start)
            logging.debug(
                "Manual location not found for %s, falling back to ORS geocode: %s",
                start,
                start_coords,
            )
        if not end_coords and ors_client:
            end_coords = geocode_route_location_ors(ors_client, CACHE_ROUTES, end)
            logging.debug(
                "Manual location not found for %s, falling back to ORS geocode: %s",
                end,
                end_coords,
            )

        # if we have coordinates, fetch the route or calculate great circle based on transport mode
        if mode == "plane" and start_coords and end_coords:
            # ORS returns (lon, lat) but our great circle expects (lat, lon)
            s_latlon = (start_coords[1], start_coords[0])
            e_latlon = (end_coords[1], end_coords[0])
            gc = calculate_great_circle(s_latlon, e_latlon)
            fname = f"great_circle_route_{idx}.geojson"
            # save the plane route as a geojson and add the filename to the df
            DOCS_GEOJSON.mkdir(parents=True, exist_ok=True)
            save_great_circle_as_geojson(gc, DOCS_GEOJSON / fname)
            df.at[idx, "filename"] = fname
        elif mode in ("auto", "train") and start_coords and end_coords and ors_client:
            # ORS expects (lon, lat)
            r = fetch_route_ors(
                ors_client,
                (start_coords[0], start_coords[1]),
                (end_coords[0], end_coords[1]),
                mode,
            )
            # save the ORS route as a geojson and add the filename to the df
            if r:
                fname = f"{row['route_id']}.geojson"
                DOCS_GEOJSON.mkdir(parents=True, exist_ok=True)
                with open(DOCS_GEOJSON / fname, "w", encoding="utf8") as f:
                    json.dump(r, f, indent=2)
                df.at[idx, "filename"] = fname

    # save the updated cache of geocoded routes
    save_cache(CACHE_ROUTES, CACHE_GEOCODE_ROUTES)

    # save the processed routes data as a CSV file in the designated output directory
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    csv_out = DOCS_DATA / "routes.csv"
    df.to_csv(csv_out, index=False)
    logging.info("Wrote %s", csv_out)

    # should we upload to Google Sheets, and can we upload?
    if upload and gspread is not None:
        try:
            set_with_dataframe(sheet, df)
            logging.info("Uploaded routes to Google Sheets")
        except Exception as e:
            logging.warning("Failed to upload routes: %s", e)

    # return the processed DataFrame,
    # in theory for use in other processing, really for consistency with process_activity
    return df


###############################################################################
# Main
###############################################################################


def main(argv=None):
    """Parse CLI arguments and run the full extract pipeline."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="Do not upload updates back to Google Sheets",
    )
    parser.add_argument(
        "--sheet-key", help="Google Sheets key to open (overrides api_keys.json)"
    )
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    setup_logging(logging.DEBUG if args.verbose else logging.INFO)

    # load API keys from the JSON file (with empty dict fallback if not found)
    api_keys = load_api_keys()

    # authenticate to Google Sheets if possible
    # defensive: if gspread is not installed, skip Google Sheets operations
    spreadsheet = None
    if gspread is not None:
        creds_path = ROOT / "scripts" / "api_keys.json"
        sheet_key = args.sheet_key or api_keys.get("google_sheets_key")
        if sheet_key:
            spreadsheet = auth_google_sheets(creds_path, sheet_key)
        else:
            logging.warning("No sheet key provided; skipping Google Sheets operations")

    # process Overview
    if spreadsheet:
        overview_sheet = spreadsheet.worksheet("Overview")
        process_overview(overview_sheet)
    else:
        logging.warning("Spreadsheet unavailable: skipping Overview")

    # process Activity (save activity_df for later use in routes)
    activity_sheet = spreadsheet.worksheet("Activity") if spreadsheet else None
    if activity_sheet:
        activity_df = process_activity(activity_sheet, upload=not args.no_upload)
    else:
        # guard clause: if no activity sheet, create an empty DataFrame to avoid errors later
        activity_df = pd.DataFrame()
        logging.warning("Spreadsheet unavailable: skipping Activity")

    # process Location
    location_sheet = spreadsheet.worksheet("Location") if spreadsheet else None
    if location_sheet:
        process_location(location_sheet, upload=not args.no_upload)

    # routes
    routes_sheet = spreadsheet.worksheet("Routes") if spreadsheet else None
    # manual locations source: scripts/manual_locations.py
    if routes_sheet:
        process_routes(
            routes_sheet,
            activity_df,
            upload=not args.no_upload,
            manual_locations=LOCATIONS,
            api_keys=api_keys,
        )

    logging.info("Done")


if __name__ == "__main__":
    main()
