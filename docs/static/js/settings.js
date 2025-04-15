// Description: Centralizes visualization settings for the map, including route styles and activity icons.

// color settings
const colors = {
  defaultMarker: "#4CAF50", // default marker color
  academic: "#FFB400", // school markers
  homeRing: "#FF0000", // home ring color
  primaryColor: "#008A51", // marker fill and popup border
  activityColor: "#0085A1", // activity popup border
  locationColor: "#FF8C00", // location popup border
};

// route styles for routes overlay
const routeStyles = {
  hike: { color: "#228B22", dashArray: null, weight: 4 }, // solid green
  boat: { color: "#1E90FF", dashArray: "1, 4", weight: 4 }, // dotted blue
  train: { color: "#8B0000", dashArray: "1, 6", weight: 4 }, // dashed red
  auto: { color: "#FF8C00", dashArray: null, weight: 2 }, // solid orange
  // plane: { color: "#00FFFF", dashArray: "20, 10", weight: 1.5 }, // long dashed cyan
  // plane: { color: "#FFD700", dashArray: "20, 10", weight: 1.5 }, // long dashed yellow
  // plane: { color: "#00FFFF", dashArray: "10, 5, 2, 5", weight: 1.5 }, // dash-dot cyan
  plane: { color: "#FFD700", dashArray: "10, 5, 2, 5", weight: 1.5 }, // dash-dot yellow
  default: { color: "#000000", dashArray: null, weight: 2 }, // solid black
};

// icon mapping for activity overlay
const activityIcons = {
  skiing: "fas fa-skiing",
  snorkeling: "fas fa-swimmer",
  "whitewater rafting": "mdi mdi-kayaking",
  hiking: "fas fa-hiking",
  paragliding: "fas fa-parachute-box",
  kayaking: "mdi mdi-kayaking",
  tubing: "fas fa-life-ring",
  meditation: "mdi mdi-meditation",
  safari: "fas fa-paw",
  "scenic flight": "mdi mdi-airplane",
};

// icon mapping for location overlay
const locationIcons = {
  mountain: "fas fa-mountain", // Mountain icon
  beach: "fas fa-umbrella-beach", // Beach icon
  city: "fas fa-city", // City skyline icon
  town: "fa-solid fa-house-chimney-window", // Town/home icon
  rural: "fas fa-tractor", // Tractor icon for rural areas
  desert: "fas fa-sun", // Sun icon for desert
  jungle: "fas fa-leaf", // Tree icon for jungle
  volcano: "fa-solid fa-volcano", // Volcano icon
  "hot springs": "fas fa-hot-tub", // Hot springs icon
};
