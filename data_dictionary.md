# Data Dictionary: Global Waypoints Project

- [Link to README.md](README.md)

This document defines the structure and purpose of the datasets used in the Global Waypoints project.

---

## **1. Main Waypoints Table**
Stores details about locations visited, including time spent and general descriptions.

| Column Name       | Data Type | Description |
|------------------|----------|-------------|
| `id`            | Integer  | Unique identifier for each waypoint |
| `location_name` | String   | Name of the place (e.g., "Bali, Indonesia") |
| `lat`           | Float    | Latitude coordinate |
| `lng`           | Float    | Longitude coordinate |
| `start_date`    | Date     | Approximate or exact arrival date (`YYYY-MM`) |
| `end_date`      | Date     | Approximate or exact departure date (`YYYY-MM`) |
| `duration_days` | Integer  | Estimated time spent (if exact dates unavailable) |
| `visit_type`    | String   | Purpose of visit (e.g., Work, Study, Solo Travel, Family) |
| `photo_album`  | String   | Link or reference to an associated photo album |
| `photos` | String | Link or reference to an associated list of photos |
| `description` | String | Short summary or story about this location |
| `notes`         | Text     | Additional details or memories from the visit |
| `importance` | Integer (1-10) | Scale of location's importance |
| `estimated` | Boolean | Indicated uncertainty in date |

---

## **2. Travel Routes Table**
Stores transportation details between locations.

| Column Name     | Data Type | Description |
|----------------|----------|-------------|
| `route_id`     | Integer  | Unique identifier for each travel route |
| `start_lat`    | Float    | Starting location latitude |
| `start_lng`    | Float    | Starting location longitude |
| `end_lat`      | Float    | Ending location latitude |
| `end_lng`      | Float    | Ending location longitude |
| `transport_mode` | String | Mode of travel (e.g., Plane, Train, Car, Boat) |
| `travel_date`  | Date     | Approximate or exact date of travel (`YYYY-MM`) |
| `usage_tags`   | String   | Tags for routes used multiple times (e.g., "2017, 2022") |

---

## **3. Activity Table**
Logs special activities like hiking routes, road trips, or unique experiences.

| Column Name     | Data Type | Description |
|----------------|----------|-------------|
| `activity_id`  | Integer  | Unique identifier for each activity |
| `location_name`| String   | Name of the location where activity took place |
| `lat`         | Float    | Latitude coordinate |
| `lng`         | Float    | Longitude coordinate |
| `activity_type` | String | Type of activity (e.g., Hiking, Snorkeling, Museum Visit) |
| `route_path`   | String  | Polyline or waypoints for mapped activities |
| `description` | String | Short summary or story about this location |
| `notes`        | Text    | Additional details about the activity |

---

<!-- ## **4. Marker Clustering Data**
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
