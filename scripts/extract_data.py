#!/usr/bin/env python3
"""extract_data.py

Convert the notebook `resources/extract_data.ipynb` into a runnable script.
Functions: overview, activity, location, routes. Saves JSON/CSV outputs and
optionally updates Google Sheets.
"""
from pathlib import Path
import argparse
import json
import logging
import uuid
import sys
from time import sleep

import pandas as pd
import geojson
from geographiclib.geodesic import Geodesic

try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    from gspread_dataframe import set_with_dataframe
except Exception:
    gspread = None

from geopy.geocoders import Nominatim
import openrouteservice

from manual_locations import LOCATIONS


ROOT = Path(__file__).resolve().parent.parent
DOCS_DATA = ROOT / "docs" / "resources" / "data"
DOCS_GEOJSON = ROOT / "docs" / "resources" / "geojson"
CACHE_GEOCODE = Path("./geocode_cache.json")
CACHE_GEOCODE_ROUTES = Path("./geocode_cache_routes.json")


def setup_logging(level=logging.INFO):
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def load_api_keys(path: Path = Path("api_keys.json")):
    if not path.exists():
        logging.warning("api_keys.json not found — some features may be disabled")
        return {}
    with open(path) as f:
        return json.load(f)


def auth_google_sheets(creds_path: Path, key: str):
    if gspread is None:
        logging.warning("gspread not installed or failed to import")
        return None
    # OAuth scopes required to read/write Google Sheets
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(creds_path), scope)
    client = gspread.authorize(creds)
    return client.open_by_key(key)


def parse_photo_list(value):
    if isinstance(value, str) and value.strip():
        return [item.strip() for item in value.split(",")]
    return []


def parse_zoom_bounds(value):
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logging.debug("Invalid zoomBounds format: %s", value)
    return None


def process_overview(sheet):
    logging.info("Processing Overview sheet...")
    overview_data = sheet.get_all_records()
    for entry in overview_data:
        raw_photos = entry.get("photos", "")
        entry["photos"] = [p.strip("[]\"' ") for p in parse_photo_list(raw_photos)]
        raw_zoom = entry.get("zoomBounds", "")
        entry["zoomBounds"] = parse_zoom_bounds(raw_zoom)

    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "overview.json"
    with open(out, "w", encoding="utf8") as fh:
        json.dump(overview_data, fh, indent=2, ensure_ascii=False)
    logging.info("Wrote %s", out)


def ensure_uuid_series(series, col_name="id"):
    vals = []
    for v in series:
        if pd.isna(v) or v == "":
            vals.append(str(uuid.uuid4()))
        else:
            vals.append(v)
    return vals


def load_cache(path: Path):
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            logging.warning("Failed to read cache %s", path)
    return {}


def save_cache(data, path: Path):
    try:
        with open(path, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logging.warning("Failed to write cache %s: %s", path, e)


def geocode_with_nominatim(geolocator, cache, location_name, sleep_time=1):
    if not location_name:
        return None, None
    if location_name in cache:
        lat, lng = cache[location_name]["lat"], cache[location_name]["lng"]
        return lat, lng
    try:
        loc = geolocator.geocode(location_name)
        if loc:
            cache[location_name] = {"lat": loc.latitude, "lng": loc.longitude}
            sleep(sleep_time)
            return loc.latitude, loc.longitude
        logging.warning("No lat/lng for %s", location_name)
    except Exception as e:
        logging.warning("Geocoding failed for %s: %s", location_name, e)
    return None, None


def format_photos_column(series):
    def _fmt(v):
        if isinstance(v, str) and v.strip():
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(x).strip(" \"'[]") for x in parsed]
            except Exception:
                return [x.strip(" \"'[]") for x in v.split(",")]
        return []

    return series.apply(_fmt)


def process_activity(sheet, upload=True, geolocator=None):
    logging.info("Processing Activity sheet...")
    records = sheet.get_all_records()
    df = pd.DataFrame(records)
    if "activity_id" not in df.columns:
        df["activity_id"] = ""
    df["activity_id"] = ensure_uuid_series(df["activity_id"], "activity_id")

    cache = load_cache(CACHE_GEOCODE)
    if geolocator is None:
        geolocator = Nominatim(user_agent="waypoints_extract", timeout=10)

    for idx, row in df.iterrows():
        lat = row.get("lat")
        lng = row.get("lng")
        if not lat or not lng or pd.isna(lat) or pd.isna(lng):
            location_name = row.get("location")
            logging.info("Geocoding Activity %s (%s)", row.get("name"), location_name)
            glat, glng = geocode_with_nominatim(geolocator, cache, location_name)
            df.at[idx, "lat"] = glat
            df.at[idx, "lng"] = glng

    save_cache(cache, CACHE_GEOCODE)

    df["photos"] = format_photos_column(df.get("photos", pd.Series([""] * len(df))))

    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "activity.json"
    df.to_json(out, orient="records", indent=2, force_ascii=False)
    logging.info("Wrote %s", out)

    if upload and gspread is not None:
        logging.info("Uploading Activity back to Google Sheets")
        df_upload = df.fillna("")
        values = [df_upload.columns.values.tolist()] + df_upload.values.tolist()
        try:
            sheet.clear()
            sheet.update(values=values, range_name="A1")
            logging.info("Activity sheet updated")
        except Exception as e:
            logging.warning("Failed to upload Activity sheet: %s", e)


def process_location(sheet, upload=True, geolocator=None):
    logging.info("Processing Location sheet...")
    records = sheet.get_all_records()
    df = pd.DataFrame(records)
    if "location_id" not in df.columns:
        df["location_id"] = ""
    df["location_id"] = ensure_uuid_series(df["location_id"], "location_id")

    cache = load_cache(CACHE_GEOCODE)
    if geolocator is None:
        geolocator = Nominatim(user_agent="waypoints_extract", timeout=10)

    for idx, row in df.iterrows():
        lat = row.get("lat")
        lng = row.get("lng")
        if not lat or not lng or pd.isna(lat) or pd.isna(lng):
            location_name = row.get("location")
            logging.info("Geocoding Location %s", location_name)
            glat, glng = geocode_with_nominatim(geolocator, cache, location_name)
            df.at[idx, "lat"] = glat
            df.at[idx, "lng"] = glng

    save_cache(cache, CACHE_GEOCODE)

    df["photos"] = format_photos_column(df.get("photos", pd.Series([""] * len(df))))

    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    out = DOCS_DATA / "location.json"
    df.to_json(out, orient="records", indent=2, force_ascii=False)
    logging.info("Wrote %s", out)

    if upload and gspread is not None:
        logging.info("Uploading Location back to Google Sheets")
        df_upload = df.fillna("")
        values = [df_upload.columns.values.tolist()] + df_upload.values.tolist()
        try:
            sheet.clear()
            sheet.update(values=values, range_name="A1")
            logging.info("Location sheet updated")
        except Exception as e:
            logging.warning("Failed to upload Location sheet: %s", e)


def calculate_great_circle(start_coords, end_coords, num_points=100):
    # start_coords and end_coords are (lat, lon)
    geod = Geodesic.WGS84
    line = geod.InverseLine(
        start_coords[0], start_coords[1], end_coords[0], end_coords[1]
    )
    points = []
    for i in range(num_points + 1):
        s = i * line.s13 / num_points
        position = line.Position(s)
        lon, lat = position["lon2"], position["lat2"]
        if points and abs(lon - points[-1][0]) > 180:
            if lon > 0:
                lon -= 360
            else:
                lon += 360
        points.append((lon, lat))
    return points


def save_great_circle_as_geojson(route_coords, output_file):
    feature = geojson.Feature(
        geometry=geojson.LineString(route_coords),
        properties={"transport_mode": "plane"},
    )
    fc = geojson.FeatureCollection([feature])
    with open(output_file, "w", encoding="utf8") as f:
        geojson.dump(fc, f)
    logging.info("Saved great circle %s", output_file)


def geocode_route_location_ors(ors_client, cache, location):
    if location in cache:
        return cache[location]
    try:
        res = ors_client.pelias_search(text=location)
        if res.get("features"):
            coords = res["features"][0]["geometry"]["coordinates"]
            cache[location] = (coords[0], coords[1])
            return coords[0], coords[1]
    except Exception as e:
        logging.warning("ORS geocode failed for %s: %s", location, e)
    return None, None


def fetch_route_ors(ors_client, start_coords, end_coords, transport_mode):
    try:
        profile = {"auto": "driving-car", "train": "driving-car"}.get(
            transport_mode, "driving-car"
        )
        r = ors_client.directions(
            coordinates=[start_coords, end_coords], profile=profile, format="geojson"
        )
        return r
    except Exception as e:
        logging.warning("ORS directions failed: %s", e)
    return None


def process_routes(
    sheet, activity_df, upload=True, manual_locations=None, api_keys=None
):
    logging.info("Processing Routes sheet...")
    df = pd.DataFrame(sheet.get_all_records())
    if "route_id" not in df.columns:
        df["route_id"] = ""
    df["route_id"] = ensure_uuid_series(df["route_id"], "route_id")

    # add hikes from activities that have a route_path
    for _, a in activity_df.iterrows():
        if (
            a.get("activity_type") == "hiking"
            and a.get("route_path")
            and a.get("route_path") not in df.get("filename", [])
        ):
            new = {
                "start_location": a.get("name"),
                "end_location": a.get("name"),
                "transport_mode": "hike",
                "filename": a.get("route_path"),
            }
            df = pd.concat([df, pd.DataFrame([new])], ignore_index=True)

    CACHE_ROUTES = load_cache(CACHE_GEOCODE_ROUTES)

    # prepare ORS client if possible
    ors_client = None
    if api_keys and api_keys.get("openrouteservice"):
        try:
            ors_client = openrouteservice.Client(key=api_keys["openrouteservice"])
        except Exception:
            logging.warning("Failed to init openrouteservice client")

    manual_locations = manual_locations or {}

    for idx, row in df.iterrows():
        filename = str(row.get("filename") or "").strip()
        if filename:
            continue
        mode = str(row.get("transport_mode") or "").lower()
        start = row.get("start_location")
        end = row.get("end_location")

        # geocode start/end using manual map first
        start_coords = manual_locations.get(start)
        end_coords = manual_locations.get(end)

        if not start_coords and ors_client:
            start_coords = geocode_route_location_ors(ors_client, CACHE_ROUTES, start)
        if not end_coords and ors_client:
            end_coords = geocode_route_location_ors(ors_client, CACHE_ROUTES, end)

        if mode == "plane" and start_coords and end_coords:
            # ORS returns (lon, lat) but our great circle expects (lat, lon)
            s_latlon = (start_coords[1], start_coords[0])
            e_latlon = (end_coords[1], end_coords[0])
            gc = calculate_great_circle(s_latlon, e_latlon)
            fname = f"great_circle_route_{idx}.geojson"
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
            if r:
                fname = f"{row['route_id']}.geojson"
                DOCS_GEOJSON.mkdir(parents=True, exist_ok=True)
                with open(DOCS_GEOJSON / fname, "w", encoding="utf8") as f:
                    json.dump(r, f, indent=2)
                df.at[idx, "filename"] = fname

    save_cache(CACHE_ROUTES, CACHE_GEOCODE_ROUTES)

    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    csv_out = DOCS_DATA / "routes.csv"
    df.to_csv(csv_out, index=False)
    logging.info("Wrote %s", csv_out)

    if upload and gspread is not None:
        try:
            set_with_dataframe(sheet, df)
            logging.info("Uploaded routes to Google Sheets")
        except Exception as e:
            logging.warning("Failed to upload routes: %s", e)


def main(argv=None):
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

    api_keys = load_api_keys()

    # authenticate to Google Sheets if possible
    spreadsheet = None
    if gspread is not None:
        creds_path = Path("api_keys.json")
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

    # process Activity
    activity_sheet = spreadsheet.worksheet("Activity") if spreadsheet else None
    if activity_sheet:
        process_activity(activity_sheet, upload=not args.no_upload)
        activity_df = pd.DataFrame(activity_sheet.get_all_records())
    else:
        activity_df = pd.DataFrame()

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
