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
  // welcome modal
  const modal = document.getElementById("welcome-modal");
  modal.style.display = "flex"; // toggle modal display on / off
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // get data and call functions to create map and layers
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

  // add map reset button
  addResetButton(mainMap, originalBounds);

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


// add legend
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

document.addEventListener("click", (event) => {
  const fullscreenButton = document.querySelector("#fullscreen-button");
  const carouselContainer = document.querySelector(".carousel-container"); // entire carousel container
  // check if clicked element is fullscreen button
  if (event.target.closest("#fullscreen-button")) {
    // const carouselContainer = document.querySelector(".carousel-container"); // entire carousel container

    if (document.fullscreenElement) {
      // if in fullscreen, exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen(); // Safari
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); // IE/Edge
      }
      carouselContainer.classList.remove("fullscreen"); // Remove fullscreen class
      fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-expand fa-stack-1x fa-inverse"></i>
      `;
    } else {
      // if not, enter fullscreen
      if (carouselContainer.requestFullscreen) {
        carouselContainer.requestFullscreen();
      } else if (carouselContainer.webkitRequestFullscreen) {
        carouselContainer.webkitRequestFullscreen(); // Safari
      } else if (carouselContainer.msRequestFullscreen) {
        carouselContainer.msRequestFullscreen(); // IE/Edge
      }
      carouselContainer.classList.add("fullscreen"); // Add fullscreen class
      fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-compress fa-stack-1x fa-inverse"></i>
      `;
    }
  }
});

// // exit fullscreen mode when pressing the "Escape" key
// document.addEventListener("fullscreenchange", () => {
//   if (!document.fullscreenElement) {
//     console.log("Exited fullscreen mode");
//   }
// });

// start everything - initialize the map
initializeMap();
