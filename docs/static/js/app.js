// Description: JavaScript code initializing the map application
// It relies on functions contained in ./overlays.js and ./image-carousel-popup.js

// This code fetches data from JSON and CSV files, processes it, and creates a map with markers and popups using Leaflet.js.
// It uses the PapaParse library for CSV parsing and Leaflet.js for map rendering, and handles international date line crossing by tripling markers.
// It includes functionality for displaying a photo carousel in popups, adding legends, and handling different map layers.
// It also includes a welcome modal, and buttons to reset the map view and link to an "About" page.


// global constants, for zooming from popups
const placeData = {};
let routeLayer;
let mainMap;

// fetch data from JSON and CSV files
function fetchData() {
  return Promise.all([
    fetch("resources/data/overview.json").then(handleFetchResponseJSON),
    fetch("resources/data/activity.csv").then(handleFetchResponseCSV),
    // fetch("resources/data/location.csv").then(handleFetchResponseCSV),
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
    .then(([overviewData, activityCsv, routesCsv]) => {
      // parse CSV data
      // throws an error if the csv's last empty line is not skipped
      const activityData = Papa.parse(activityCsv, {
        header: true,
        skipEmptyLines: true,
      }).data;
      // const locationData = Papa.parse(locationCsv, { header: true }).data;
      const routeData = Papa.parse(routesCsv, {
        header: true,
        skipEmptyLines: true,
      }).data;

      // create overlayMarkers for the map
      const markers = createMarkers(overviewData);
      const originalBounds = createBounds(overviewData);
      const activities = addActivityMarkers(activityData);
      const routes = createRouteLayers(routeData);

      // pass to createMap function
      createMap(markers, originalBounds, activities, routes);
    })
    .catch((error) => console.error("Error fetching data:", error));
}

// modal
function setupWelcomeModal() {
  const modal = document.getElementById("welcome-modal");
  modal.style.display = "flex"; // toggle modal display on / off

  // wait for modal to display, then fade-in text
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      document.querySelectorAll(".modal-transition").forEach((el) => {
        el.style.opacity = "1"; // trigger fade-in
      });
    }, 500); // delay to sync with modal appearance
  });

  // close modal on click
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

// create map, base layers and overlays, toggle legend and route controls
function createMap(markers, originalBounds, activities, routes) {
  // define layers
  const baseMaps = createBaseMaps();
  const overlayMaps = {
    Waypoints: markers,
    Activities: activities,
    Routes: routes.routeLayer,
  };

  // create map
  // declared in global scope to access in popup zoom function
  mainMap = L.map("map", {
    layers: [baseMaps.Satellite, markers],
    worldCopyJump: true,
  });

  // set initial map zoom level and bounds, add controls
  mainMap.fitBounds(originalBounds);
  L.control.layers(baseMaps, overlayMaps).addTo(mainMap);
  routeControls = L.control.layers(null, routes.sublayers, {
    collapsed: false,
  });

  // add legend, map reset and about buttons
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

// opens the about modal
function openModal() {
  // close welcome modal if open
  const welcomeModal = document.getElementById("welcome-modal");
  if (welcomeModal && welcomeModal.style.display === "flex") {
    welcomeModal.style.display = "none";
  }

  // display about modal, add route legend styles
  document.getElementById("aboutModal").style.display = "flex";
  applyLegendStyles(routeStyles);
}

// // closes the about modal with the 'X' button
// function closeModal() {
//   document.getElementById("aboutModal").style.display = "none";
// }

// closes modal when clicking outside of the modal content
function setupAboutModal() {
  const modal = document.getElementById("aboutModal");

  // Close modal on click
  modal.addEventListener("click", (event) => {
    // Ensure only clicks outside the modal content close it
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
}

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
      svg.setAttribute("height", "10");
      svg.setAttribute("viewBox", "0 0 100 10");

      // create the line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", "5");
      line.setAttribute("x2", "100");
      line.setAttribute("y2", "5");
      line.setAttribute("stroke", style.color);
      line.setAttribute("stroke-width", style.weight);
      if (style.dashArray) {
        line.setAttribute("stroke-dasharray", style.dashArray);
      }

      // append the line to the SVG
      svg.appendChild(line);

      // append the SVG to the line container
      lineContainer.appendChild(svg);
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

// toggle legend and route controls on overlay add/remove
const handleOverlayAdd = (e, legend, routeControls, map) => {
  if (e.name === "Waypoints") legend.addTo(map);
  if (e.name === "Routes") routeControls.addTo(map);
};

const handleOverlayRemove = (e, legend, routeControls, map) => {
  if (e.name === "Waypoints") map.removeControl(legend);
  if (e.name === "Routes") map.removeControl(routeControls);
};

// event listener for photo reel fullscreen button
document.addEventListener("click", (event) => {
  const fullscreenButton = document.querySelector("#fullscreen-button");
  const carouselContainer = document.querySelector(".carousel-container"); // entire carousel container
  // check if clicked element is fullscreen button
  if (event.target.closest("#fullscreen-button")) {
    if (document.fullscreenElement) {
      // if in fullscreen, exit fullscreen, change button to enter fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen(); // Safari
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); // IE/Edge
      }
      carouselContainer.classList.remove("fullscreen");
      fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-expand fa-stack-1x fa-inverse"></i>
      `;
    } else {
      // if not, enter fullscreen, change button to exit fullscreen
      if (carouselContainer.requestFullscreen) {
        carouselContainer.requestFullscreen();
      } else if (carouselContainer.webkitRequestFullscreen) {
        carouselContainer.webkitRequestFullscreen(); // Safari
      } else if (carouselContainer.msRequestFullscreen) {
        carouselContainer.msRequestFullscreen(); // IE/Edge
      }
      carouselContainer.classList.add("fullscreen");
      fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-compress fa-stack-1x fa-inverse"></i>
      `;
    }
  }
});

// start everything - initialize the map
initializeMap();
