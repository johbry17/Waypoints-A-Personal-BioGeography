# Data Dictionary: Global Waypoints Project

- [Link to README.md](README.md)

This document defines the structure and purpose of the datasets used in the Global Waypoints project.

![ERD](./resources/ERD.png)

---

## **1. Overview Table**
Stores details about locations visited, including time spent and general descriptions.

| Column Name      | Data Type  | Description |
|-----------------|-----------|-------------|
| `id`           | Integer PK | Unique identifier for each waypoint |
| `name`         | TEXT       | Name of the waypoint or place |
| `lat`          | Float      | Latitude coordinate |
| `lng`          | Float      | Longitude coordinate |
| `start_date`   | Date       | Approximate or exact arrival date |
| `end_date`     | Date       | Approximate or exact departure date |
| `photo_album`  | TEXT       | Link or reference to an associated photo album |
| `photos`       | TEXT       | Links or references to associated photos |
| `description`  | TEXT       | Short summary or story about this location |
| `notes`        | TEXT       | Additional details or memories from the visit |
| `importance`   | Integer    | Scale of location's admittedly subjective importance to biography (1-10) |
| `visit_type`   | TEXT       | Purpose of visit (e.g., home, work, school, friends, family, solo) |
| `duration_days`| Integer    | Estimated time spent in days |
---

## **2. Pictures Table**
Stores image details for locations and events.

| Column Name     | Data Type  | Description |
|----------------|-----------|-------------|
| `picture_id`   | Integer PK | Unique identifier for each picture |
| `file_name`    | TEXT       | Name of the picture file |
| `file_location`| TEXT       | Storage location of the picture |
| `picture_name` | TEXT       | Name or title of the picture |
| `caption`      | TEXT       | Caption or description of the picture |
| `overview_id`  | Integer FK | Links to the `Overview` table |
| `location_id`  | Integer FK | Links to the `Location` table |

---

## **3. Location Table**
Stores geographic details of visited locations.

| Column Name     | Data Type  | Description |
|----------------|-----------|-------------|
| `location_id`  | Integer PK | Unique identifier for each location |
| `name`         | TEXT       | Name of the location |
| `lat`          | Float      | Latitude coordinate |
| `lng`          | Float      | Longitude coordinate |
| `overview_id`  | Integer FK | Links to the `Overview` table |

---


## **4. Routes Table**
Stores transportation details between locations.

| Column Name         | Data Type  | Description |
|--------------------|-----------|-------------|
| `route_id`        | Integer PK | Unique identifier for each travel route |
| `start_location_id`| Integer FK | Starting location reference |
| `end_location_id`  | Integer FK | Ending location reference |
| `transport_mode`   | TEXT       | Mode of travel (e.g., Plane, Train, Car) |
| `travel_date`      | Date       | Approximate or exact date of travel |
| `usage_tags`       | TEXT       | Tags for multiple route usage (e.g., "2017, 2022") |

---

## **5. Activity Table**
Logs special activities like hiking routes, road trips, or unique experiences.

| Column Name     | Data Type  | Description |
|----------------|-----------|-------------|
| `activity_id`  | Integer PK | Unique identifier for each activity |
| `trip_id`      | Integer FK | Links to the `Trip` table |
| `location_id`  | Integer FK | Reference to the location where activity took place |
| `activity_type`| TEXT       | Type of activity (e.g., Hiking, Museum Visit) |
| `route_path`   | TEXT       | Polyline or waypoints for mapped activities |
| `description`  | TEXT       | Short summary or story about this location |
| `notes`        | TEXT       | Additional details about the activity |

---

## **6. Trip Table**

Stores details about multi-location trips.

| Column Name      | Data Type  | Description |
|-----------------|-----------|-------------|
| `trip_id`      | Integer PK | Unique identifier for each trip |
| `trip_name`    | TEXT       | Name of the trip |
| `trip_description` | TEXT   | Brief description of the trip |
| `trip_start_date`  | DateTime | Start date of the trip |
| `trip_end_date`    | DateTime | End date of the trip |
| `overview_id`  | Integer FK | Links to the `Overview` table |

---

## **7. TripLocation Table**

Stores relationships between trips and locations.

| Column Name    | Data Type  | Description |
|--------------|-----------|-------------|
| `trip_id`   | Integer FK | Links to the `Trip` table |
| `location_id`| Integer FK | Links to the `Location` table |
| `sequence`  | Integer    | Order of locations in the trip |

---

## **8. PictureLocation Table** (&#191;Optional?)

Stores relationships between pictures and locations.

| Column Name    | Data Type  | Description |
|--------------|-----------|-------------|
| `picture_id` | Integer FK | Links to the `Pictures` table |
| `location_id`| Integer FK | Links to the `Location` table |

---

<!-- ## PictureOrder Table (&#191;Optional?)

CREATE TABLE PictureOrder (
    picture_id INTEGER REFERENCES Pictures(picture_id),
    context TEXT CHECK(context IN ('overview', 'location')), -- Defines reel type
    order INTEGER,
    PRIMARY KEY (picture_id, context)
); -->


<!-- ## **Marker Clustering Data**
Helps optimize the map by grouping markers into clusters based on zoom levels.

| Column Name    | Data Type | Description |
|---------------|----------|-------------|
| `cluster_id`  | Integer  | Unique identifier for each cluster |
| `center_lat`  | Float    | Latitude of the cluster center |
| `center_lng`  | Float    | Longitude of the cluster center |
| `waypoint_ids` | String  | List of waypoint `id`s in this cluster | -->

## Layers

- **Markers and marker clusters** - A high-level popup containing many photos, that expands into multiple markers on zoom for towns / cities, and subdivided photos. Scale marker size like a bubble map, to reflect time stayed. Possibly add icons or color-coding (work, study, solo, family, friends).

- **Transit Routes** - Planes, trains, and automobiles. And boats. Use different line styles (dashed for planes, lines for roads, dotted for trains, etc) or color coding. Use Leaflet.Geodesic or D3.js to plot curved great-circle routes between airports. Use OpenStreetMap (OSM) with routing APIs (e.g., OpenRouteService, Mapbox Directions API) to generate real road/train routes.

- **Stay Duration Heat Map**

- **Activity Layer** - Icons for snorkeling or hiking (map hike routes?), skiing, rafting, etc

---

## **Handling Uncertainty**
- `start_date` and `end_date` can be **empty or estimated**.  
- `duration_days` is used when exact dates are unknown.  
- A Boolean flag (`estimated: true`) could be added in the future to mark uncertain data.  

---

## **Future Enhancements**
- Implement a **time slider** for filtering visits by year.  
- Add a **Story Mode**, to animate the journey through time.  
- Store **photo metadata** (e.g., GPS locations, timestamps, steps).  
- Improve **route visualization** (e.g., following roads instead of straight lines).  
- Add **Interactive Stats**? Countries visited, distance traveled, longest stays
- Create a themed **map style** a la Indiana Jones or minimalist dark mode

---

### **Notes**
- This structure is flexible. If new columns are needed, they can be added without breaking existing data.
- The data is stored in **Google Sheets**, but exported as JSON for use in the map.

---

This document will be updated as the project evolves.
