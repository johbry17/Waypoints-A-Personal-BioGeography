// Description: JavaScript code initializing the map application
// It relies on functions contained in ./overlays.js and ./image-carousel.js
// ./visualizationSettings.js contains the map settings and route styles
//
// This code fetches data from JSON and CSV files, processes it, and creates a map with markers and popups using Leaflet.js.
// It uses the PapaParse library for CSV parsing and Leaflet.js for map rendering, and handles international date line crossing by tripling markers.
// It includes functionality for displaying a photo carousel in popups, adding legends, and handling different map layers.
// It also includes a welcome modal, and buttons to reset the map view and a button for an "About" modal.

// Table of Contents:

// data fetching and parsing, map initialization
// welcome modal
// map creation and layer addition
// reset and about buttons
// overlay addition and removal handlers
// about modal
// legends
// initialize the map

// global constants, for zooming from popups...
const placeData = {};
let routeLayer;
let mainMap;
// ...and for the route legend popup
let isLegendChecked = false;

// fetch data from JSON and CSV files
function fetchData() {
  return Promise.all([
    fetch("resources/data/overview.json").then(handleFetchResponseJSON),
    fetch("resources/data/activity.csv").then(handleFetchResponseCSV),
    fetch("resources/data/locations.csv").then(handleFetchResponseCSV),
    fetch("resources/data/routes.csv").then(handleFetchResponseCSV),
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
  // call modal function
  setupWelcomeModal();
  setupAboutModal();

  // get data and call functions to create map and layers
  fetchData()
    .then(([overviewData, activityCsv, locationCsv, routesCsv]) => {
      // parse CSV data
      // throws an error if the csv's last empty line is not skipped
      const activityData = Papa.parse(activityCsv, {
        header: true,
        skipEmptyLines: true,
      }).data;
      const locationData = Papa.parse(locationCsv, {
        header: true,
        skipEmptyLines: true,
      }).data;
      const routeData = Papa.parse(routesCsv, {
        header: true,
        skipEmptyLines: true,
      }).data;

      // create overlayMarkers for the map
      const markers = createMarkers(overviewData);
      const originalBounds = createBounds(overviewData);
      const locations = addLocationMarkers(locationData);
      const routes = createRouteLayers(routeData);
      const activities = addActivityMarkers(activityData);

      // pass to createMap function
      createMap(markers, originalBounds, activities, locations, routes);
    })
    .catch((error) => console.error("Error fetching data:", error));
}

//////////////////////////////////////////////////////////

// welcome modal
function setupWelcomeModal() {
  const modal = document.getElementById("welcome-modal");
  const mapContainer = document.getElementById("map");

  // display modal on page load, not map
  mapContainer.style.display = "none"; // hide map while modal is open
  modal.style.display = "flex"; // modal display on

  // wait for modal to display, then fade-in text
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      document.querySelectorAll(".modal-transition").forEach((el) => {
        el.style.opacity = "1"; // trigger fade-in
      });
    }, 500); // delay to sync with modal appearance
  });

  // event listener to close modal on click, display map
  // must invalidate map size to display correctly (force a rerender)
  // (leaflet thinks the map size is 0x0 when display: none)
  modal.addEventListener("click", () => {
    modal.style.display = "none";
    mapContainer.style.display = 'block';
    mainMap.invalidateSize(); 
  });
}

//////////////////////////////////////////////////////////

// create map, base layers and overlays, toggle legend and route controls
function createMap(markers, originalBounds, activities, locations, routes) {
  // define layers
  const baseMaps = createBaseMaps();
  const overlayMaps = {
    Waypoints: markers,
    Activities: activities,
    // Locations: locations,
    Routes: routes.routeLayer,
  };

  // create map
  // declared in global scope to access in popup zoom function
  mainMap = L.map("map", {
    layers: [baseMaps.Satellite, markers],
    worldCopyJump: true,
  });

  
  // // create custom panes for stacking
  // mainMap.createPane("routesPane");
  // mainMap.createPane("locationsPane");
  // mainMap.createPane("waypointsPane");
  // // mainMap.createPane("activitiesPane");

  // // set zIndex for each pane, routes to activities
  // mainMap.getPane("routesPane").style.zIndex = 400;
  // mainMap.getPane("locationsPane").style.zIndex = 500;
  // mainMap.getPane("waypointsPane").style.zIndex = 600;
  // // mainMap.getPane("activitiesPane").style.zIndex = 700;

  // set initial map zoom level and bounds, add controls
  mainMap.fitBounds(originalBounds);
  L.control.layers(baseMaps, overlayMaps).addTo(mainMap);
  routeControls = L.control.layers(null, routes.sublayers, {
    collapsed: false,
  });

  // add zoom-based visibility for the locations layer
  mainMap.on("zoomend", () => {
    const currentZoom = mainMap.getZoom();
    console.log("Current Zoom Level:", currentZoom);

    // show locations layer only if zoom level is below 5
    if (currentZoom > 5) {
      if (!mainMap.hasLayer(locations)) {
        console.log("Adding locations layer to the map.");
        mainMap.addLayer(locations);
      }
    } else {
      if (mainMap.hasLayer(locations)) {
        console.log("Removing locations layer from the map.");
        mainMap.removeLayer(locations);
      }
    }
  });

  // style route legend popup, add main legend, about and reset buttons
  applyLegendStyles(routeStyles);
  addAboutButton(mainMap);
  addResetButton(mainMap, originalBounds);
  const legend = addLegend();
  legend.addTo(mainMap);

  // event listener to toggle display of legend and route controls
  mainMap.on("overlayadd", (e) =>
    handleOverlayAdd(e, legend, routeControls, mainMap)
  );
  mainMap.on("overlayremove", (e) =>
    handleOverlayRemove(e, legend, routeControls, mainMap)
  );

  // add copyright and place Leaflet attribution control
  mainMap.attributionControl
    .setPosition("bottomleft")
    .addAttribution(
      `&copy; ${new Date().getFullYear()} Bryan Johns. All rights reserved. Images may not be used without explicit permission.`
    );
}

// creates base maps
function createBaseMaps() {
  return {
    Satellite: L.esri.basemapLayer("Imagery"),
    "Street Map": L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    ),
    "Nat Geo": L.esri.basemapLayer("NationalGeographic"),
    Physical: L.esri.basemapLayer("Physical"),
    Oceans: L.esri.basemapLayer("Oceans"),
    Grayscale: L.esri.basemapLayer("Gray"),
    // Firefly: L.esri.basemapLayer("ImageryFirefly"),
  };
}

//////////////////////////////////////////////////////////

// button to reset map to original bounds
function addResetButton(map, initialBounds) {
  const resetControl = L.control({ position: "topleft" });

  resetControl.onAdd = () => {
    const button = L.DomUtil.create("button", "reset-map-button");
    button.innerHTML = '<i class="mdi mdi-refresh"></i>'; // refresh icon
    button.title = "Return map to global view"; // tooltip text

    // prevent map interactions when clicking the button
    L.DomEvent.disableClickPropagation(button);

    // event listener to reset map
    button.addEventListener("click", () => {
      map.fitBounds(initialBounds); // reset to initial bounds
    });

    return button;
  };

  resetControl.addTo(map); // add to map
}

// add About button to map
function addAboutButton(map) {
  const aboutButton = L.control({ position: "topleft" });

  aboutButton.onAdd = () => {
    const button = L.DomUtil.create("button", "about-button");
    button.innerHTML = `<i class="fas fa-info-circle"></i>`;
    button.title = "About";
    button.onclick = openModal;
    L.DomEvent.disableClickPropagation(button);
    return button;
  };

  aboutButton.addTo(map);
}

//////////////////////////////////////////////////////////

// adds waypoints legend and route controls to map, toggle routes legend popup
const handleOverlayAdd = (e, legend, routeControls, map) => {
  // add main legend to map
  if (e.name === "Waypoints") {
    legend.addTo(map);
  }
  //add route controls to map
  if (e.name === "Routes") {
    routeControls.addTo(map);

    // routes legend popup toggle
    const legendTrigger = document.getElementById("legend-link");
    const legendPopup = document.getElementById("routes-legend-popup");
    const checkbox = legendTrigger
      .closest("label")
      .querySelector("input[type='checkbox']");

    if (checkbox && legendPopup) {
      // add event listener to the routes legend checkbox
      // can't be added before the checkbox is created in the DOM
      checkbox.addEventListener("change", () => {
        isLegendChecked = checkbox.checked; // update global variable
        if (checkbox.checked) {
          legendPopup.classList.remove("hidden"); // show legend
        } else {
          legendPopup.classList.add("hidden"); // hide legend
        }
      });

      // restore checkbox and legend popup state if already checked
      checkbox.checked = isLegendChecked; // restore checkbox state
      if (isLegendChecked) {
        legendPopup.classList.remove("hidden"); // show legend
      } else {
        legendPopup.classList.add("hidden"); // hide legend
      }
    }
  }
};

// remove legends and route controls when overlays are removed
const handleOverlayRemove = (e, legend, routeControls, map) => {
  if (e.name === "Waypoints") {
    map.removeControl(legend);
  }
  if (e.name === "Routes") {
    map.removeControl(routeControls);
    const legendPopup = document.getElementById("routes-legend-popup");
    if (legendPopup) {
      legendPopup.classList.add("hidden");
    }
  }
};

//////////////////////////////////////////////////////////

// opens the About modal
function openModal() {
  // display About modal, add route legend styles
  document.getElementById("aboutModal").style.display = "flex";
}

// closes About modal with the 'X' button
function closeModal() {
  document.getElementById("aboutModal").style.display = "none";
}

// closes About modal when clicking outside of the .modal-content
function setupAboutModal() {
  const modal = document.getElementById("aboutModal");
  modal.addEventListener("click", (event) => {
    // ensure only clicks outside the .modal-content close it
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
}

// sets the copyright year in the About modal
document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("current-year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

//////////////////////////////////////////////////////////

// add main map legend
function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const legendElement = document.getElementById("map-legend");
    const clonedLegend = legendElement.cloneNode(true); // clone hidden legend
    clonedLegend.style.display = "block"; // display cloned legend
    return clonedLegend;
  };
  return legend;
}

// route legend - colors and adds dash styles
function applyLegendStyles(routeStyles) {
  const legendItems = document.querySelectorAll(".custom-legend-item");

  legendItems.forEach((item) => {
    const routeType = item.getAttribute("data-route");
    const style = routeStyles[routeType] || routeStyles.default;

    // color the icon
    const icon = item.querySelector(".custom-legend-icon");
    if (icon) {
      icon.style.color = style.color;
    }

    // create, color, and dash style the line
    const lineContainer = item.querySelector(".custom-legend-line");
    if (lineContainer) {
      // clear any existing content
      lineContainer.innerHTML = "";

      // create SVG element
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "15");
      svg.setAttribute("viewBox", "0 0 100 15");

      // create the line
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", "0");
      line.setAttribute("y1", "5");
      line.setAttribute("x2", "100");
      line.setAttribute("y2", "5");
      line.setAttribute("stroke", style.color);
      // scale the stroke width (visually, the height) for the legend
      line.setAttribute("stroke-width", style.weight * 3);
      // scale the width of the dots and dashes in the legend (the gaps are not scaled)
      if (style.dashArray) {
        const scaledDashArray = style.dashArray
          .split(",")
          .map(
            (value, index) =>
              index % 2 === 0 ? parseFloat(value) * 4 : parseFloat(value) // skips the gaps
          )
          .join(",");
        line.setAttribute("stroke-dasharray", scaledDashArray);
      }

      // append the line to the SVG
      svg.appendChild(line);

      // append the SVG to the line container
      lineContainer.appendChild(svg);
    }
  });
}

//////////////////////////////////////////////////////////

// start everything - initialize the map
initializeMap();
