// Description: JavaScript code for the map application

// This code fetches data from JSON and CSV files, processes it, and creates a map with markers and popups using Leaflet.js.
// It includes functionality for displaying a photo carousel in popups, adding legends, and handling different map layers.
// It uses the PapaParse library for CSV parsing and Leaflet.js for map rendering, and handles international date line crossing by tripling markers.

// fetch data from JSON and CSV files
function fetchData() {
  return Promise.all([
    fetch("resources/data/overview.json").then(handleFetchResponseJSON),
    fetch("resources/data/Activity.csv").then(handleFetchResponseCSV),
    fetch("resources/data/Location.csv").then(handleFetchResponseCSV),
  ]);
}

// error handling for fetch response
function handleFetchResponseJSON(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
}

function handleFetchResponseCSV(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.text();
}

// initialize map
function initializeMap() {
  fetchData()
    .then(([overviewData, activityCsv, locationCsv]) => {
      // parse CSV data
      const activityData = Papa.parse(activityCsv, { header: true }).data;
      const locationData = Papa.parse(locationCsv, { header: true }).data;

      // create overlayMarkers for the map
      const markers = createMarkers(overviewData);
      const originalBounds = createBounds(overviewData);
      const activities = addActivityMarkers(activityData, locationData);

      // pass to createMap
      createMap(markers, originalBounds, activities);
    })
    .catch((error) => console.error("Error fetching data:", error));
}

// create map, combining base map and layers, legend toggle
function createMap(markers, originalBounds, activities) {
  // define layers
  const baseMaps = createBaseMaps();
  const overlayMaps = { Markers: markers, Activities: activities };

  // create map
  const mainMap = L.map("map", {
    layers: [baseMaps.Satellite, markers],
    worldCopyJump: true,
  });

  // set initial map zoom level and bounds, add controls
  mainMap.fitBounds(originalBounds);
  L.control.layers(baseMaps, overlayMaps).addTo(mainMap);

  // add legend, with toggle
  const legend = addLegend();
  legend.addTo(mainMap);

  // event listeners for legend toggling
  mainMap.on("overlayremove", (eventLayer) => {
    if (eventLayer.name === "Markers") {
      mainMap.removeControl(legend);
    }
  });

  mainMap.on("overlayadd", (eventLayer) => {
    if (eventLayer.name === "Markers") {
      legend.addTo(mainMap);
    }
  });

  // add copyright and place Leaflet attribution control
  mainMap.attributionControl.setPosition("bottomleft");
  const currentYear = new Date().getFullYear(); 
  mainMap.attributionControl.addAttribution(
    `&copy; ${currentYear} Bryan Johns. All rights reserved. Images may not be used without explicit permission.`
  );
}

// creates base maps
function createBaseMaps() {
  return {
    Satellite: L.esri.basemapLayer("Imagery"),
    "National Geographic": L.esri.basemapLayer("NationalGeographic"),
    Physical: L.esri.basemapLayer("Physical"),
    Oceans: L.esri.basemapLayer("Oceans"),
    Grayscale: L.esri.basemapLayer("Gray"),
    Firefly: L.esri.basemapLayer("ImageryFirefly"),
  };
}

// start everything - initialize the map
initializeMap();
