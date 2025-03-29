// // Description: JavaScript code for the map application

// // This code fetches data from JSON and CSV files, processes it, and creates a map with markers and popups using Leaflet.js
// // It also includes functionality for displaying a photo carousel in popups, adding legends, and handling different map layers
// // It uses the PapaParse library for CSV parsing and Leaflet.js for map rendering
// // It also handles international date line crossing by tripling markers

// // fetch data from JSON and CSV files
// Promise.all([
//   fetch("../../resources/data/overview.json").then((response) => {
//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }
//     return response.json();
//   }),
//   fetch("../../resources/data/Activity.csv").then((response) =>
//     response.text()
//   ),
//   fetch("../../resources/data/Location.csv").then((response) =>
//     response.text()
//   ),
// ])
//   .then(([overviewData, activityCsv, locationCsv]) => {
//     // parse CSV data
//     const activityData = Papa.parse(activityCsv, { header: true }).data;
//     const locationData = Papa.parse(locationCsv, { header: true }).data;

//     // triple markers to handle international date line crossing
//     const tripledData = tripledMarkers(overviewData);

//     // create overlayMarkers for the map
//     let markers = L.featureGroup(tripledData.map(addMarker));
//     const originalBounds = L.featureGroup(
//       overviewData.map(addMarker)
//     ).getBounds();
//     const activities = addActivityMarkers(activityData, locationData);

//     // pass to createMap
//     createMap(markers, originalBounds, activities);
//   })
//   .catch((error) => {
//     console.error("Error fetching data:", error);
//   });

// // function to create base maps and layers
// function createMap(markers, originalBounds, activities) {
//   // create base layer
//   let satMap = L.esri.basemapLayer("Imagery");

//   // create objects to hold the base maps...
//   let baseMap = {
//     Satellite: satMap,
//     "National Geographic": L.esri.basemapLayer("NationalGeographic"),
//     Physical: L.esri.basemapLayer("Physical"),
//     Oceans: L.esri.basemapLayer("Oceans"),
//     Grayscale: L.esri.basemapLayer("Gray"),
//     Firefly: L.esri.basemapLayer("ImageryFirefly"),
//   };
//   // ...and overlay maps
//   let overlayMaps = {
//     Markers: markers,
//     Activities: activities,
//   };

//   // create map
//   let mainMap = L.map("map", {
//     layers: [satMap, markers],
//     // loads data when crossing the international date line
//     worldCopyJump: true,
//   });
//   // set initial map zoom level and bounds
//   mainMap.fitBounds(originalBounds);

//   // create toggle for map layers
//   L.control
//     .layers(baseMap, overlayMaps, {
//       // collapsed: false,
//     })
//     .addTo(mainMap);

//   // call function to add legend to map
//   let legendToggle = addLegend();
//   legendToggle.addTo(mainMap);

//   // remove legend if marker layer toggled off
//   mainMap.on("overlayremove", function (eventLayer) {
//     if (eventLayer.name === "Markers") {
//       mainMap.removeControl(legendToggle);
//     }
//   });

//   // add legend if marker layer toggled on
//   mainMap.on("overlayadd", function (eventLayer) {
//     if (eventLayer.name === "Markers") {
//       legendToggle.addTo(mainMap);
//     }
//   });

//   // set Leaflet attribution control to bottom left
//   mainMap.attributionControl.setPosition("bottomleft");

//   return mainMap;
// }

// // triples markers for crossing the international date line
// function tripledMarkers(data) {
//   const tripledData = [];

//   data.forEach((place) => {
//     // ensure lng and lat are numbers
//     // avoid concatenation of strings
//     const lng = parseFloat(place.lng);
//     const lat = parseFloat(place.lat);

//     // add original marker
//     tripledData.push({ ...place, lng, lat });

//     // add longitude + 360
//     tripledData.push({
//       ...place,
//       lng: lng + 360,
//       lat,
//     });

//     // add longitude - 360
//     tripledData.push({
//       ...place,
//       lng: lng - 360,
//       lat,
//     });
//   });

//   return tripledData;
// }

// // function to add markers to map
// function addMarker(place) {
//   const isAcademic = place.visit_type === "school";

//   // set marker color based on visit type
//   const markerColor = isAcademic ? "#FFB400" : "#4CAF50"; // yellow for school, green for others

//   // set radius based on importance
//   const radius = place.importance * 2;

//   // create marker for each place
//   let mainMarker = L.circleMarker([place.lat, place.lng], {
//     radius: radius,
//     color: markerColor,
//     fillColor: "#008A51",
//     fillOpacity: 0.6,
//     weight: 3,
//   });

//   // if "home" marker
//   if (place.home) {
//     // extra red border ring for home markers
//     const homeRing = L.circleMarker([place.lat, place.lng], {
//       radius: radius + 1, // slightly larger radius for the ring
//       color: "#FF0000",
//       fillColor: "transparent",
//       fillOpacity: 0,
//       weight: 4,
//     });

//     // group main marker and home ring
//     marker = L.featureGroup([homeRing, mainMarker]);
//   } else {
//     // for non-home markers
//     marker = mainMarker;
//   }

//   // tooltip for hover
//   marker.bindTooltip(
//     `<div style="text-align: center;">
//       <b>${place.location_name}</b><br>
//       Click for more info
//      </div>`,
//     {
//       permanent: false,
//       direction: "top",
//     }
//   );

//   // create popup for each marker
//   marker.bindPopup(createPopupContent(place));

//   // initialize carousel on popup open
//   marker.on("popupopen", () => {
//     const photoSet = place.photos.map(
//       (photo) => `static/images/${place.photo_album}/${photo}`
//     );
//     displayMultiplePhotos(photoSet, `carousel-${place.id}`);
//   });

//   // return markers for layer
//   return marker;
// }

// function createPopupContent(place) {
//   // clone carousel template
//   const template = document.querySelector("#carousel-template");
//   const carouselElement = template.content.cloneNode(true);

//   // set ID for photo carousel
//   const carouselContainer = carouselElement.querySelector(
//     ".carousel-container"
//   );
//   carouselContainer.id = `carousel-${place.id}`;

//   // check if there are photos
//   let carouselHTML =
//     place.photos && place.photos.length > 0
//       ? carouselContainer.outerHTML
//       : `
//         <div class="no-photos">
//           <p>No photos available</p>
//         </div>
//       `;

//   // add school icon if visit_type was academic, including D.C. and Vermont
//   const schoolIcon =
//     place.visit_type === "school" ||
//     place.location_name === "Washington, D.C." ||
//     place.location_name === "Vermont"
//       ? '<i class="fas fa-graduation-cap school-icon"></i>'
//       : "";

//   // add home icon if it was a residence
//   const homeIcon = place.home
//     ? '<i class="fas fa-home home-icon" style="color: #FF5733;"></i>'
//     : "";

//   // add popup text
//   const popupContent = `
//     <div class="popup-content">
//       <h3><i class="fas fa-globe"></i> ${homeIcon} ${schoolIcon} ${place.location_name}</h3>
//       <p>${place.description}</p>
//       <p>${place.notes}</p>
//     </div>
//   `;

//   // return photo carousel and popup content
//   return `
//     ${carouselHTML}
//     ${popupContent}
//   `;
// }

// function addLegend() {
//   const legend = L.control({ position: "bottomright" });

//   legend.onAdd = function () {
//     const div = L.DomUtil.create("div", "custom-legend");
//     div.innerHTML = `
//       <h4>Border Color</h4>
//       <div><i class="fas fa-home home-icon" style="color: #FF5733;"></i> Residence</div>
//       <div><i class="fas fa-graduation-cap" style="color: #FFB400;"></i> Academic</div>
//       <div><i class="fas fa-globe" style="color: #4CAF50;"></i> Other</div>
//       <p>Markers scaled<br>by life impact</p>
//     `;
//     return div;
//   };

//   return legend;
// }

// // icon mapping for activity overlay
// const activityIcons = {
//   skiing: "fas fa-skiing",
//   snorkeling: "fas fa-swimmer",
//   whitewater_rafting: "fas fa-life-ring",
//   hiking: "fas fa-hiking",
//   paragliding: "fas fa-parachute-box",
//   kayaking: "mdi mdi-kayaking",
// };

// function addActivityMarkers(activityData, locationData) {
//   // create layer for activity markers
//   const activityLayer = L.layerGroup();

//   // get location details for each activity
//   const activityWithLocations = activityData
//     .map((activity) => {
//       const location = locationData.find(
//         (loc) => loc.location_id === activity.location_id
//       );
//       return location
//         ? {
//             ...activity,
//             lat: location.lat,
//             lng: location.lng,
//             location_name: location.name,
//           }
//         : null;
//     })
//     .filter(Boolean); // remove any null locations

//   // tripled the markers for international date line crossing
//   const tripledActivities = tripledMarkers(activityWithLocations);

//   // add markers to the activity layer
//   tripledActivities.forEach((activity) => {
//     // assign icon based on activity type
//     const iconClass =
//       activityIcons[activity.activity_type.toLowerCase()] || "fa-map-marker";

//     // capitalize for display
//     const formattedActivityType = capitalizeWords(
//       activity.activity_type.replace("_", " ")
//     );

//     // create icon
//     const activityIcon = L.divIcon({
//       html: `
//       <span class="fa-stack fa-lg activity-icon-stack">
//         <i class="fas fa-circle fa-stack-2x"></i>
//         <i class="${iconClass} fa-stack-1x fa-inverse"></i>
//       </span>
//     `,
//       className: "activity-icon",
//       iconSize: [20, 20],
//       iconAnchor: [10, 10],
//     });

//     // create marker
//     const marker = L.marker([activity.lat, activity.lng], {
//       icon: activityIcon,
//     });

//     // tooltip for hover
//     marker.bindTooltip(
//       `<div style="text-align: center;">
//       <b>${activity.location_name}</b><br>
//       ${formattedActivityType}
//      </div>`,
//       {
//         permanent: false,
//         direction: "top",
//       }
//     );

//     // add popup
//     marker.bindPopup(`
//         <div>
//           <h4>${activity.location_name}</h4>
//           <p><b><i class="${iconClass}" style="color: #0085A1;"></i></b> ${formattedActivityType}</p>
//           <p>${activity.description}</p>
//         </div>
//       `);

//     // add marker to activity layer
//     activityLayer.addLayer(marker);
//   });

//   return activityLayer;
// }

// // capitalize the first letter of each word
// function capitalizeWords(str) {
//   return str
//     .toLowerCase()
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ");
// }

// Description: JavaScript code for the map application

// This code fetches data from JSON and CSV files, processes it, and creates a map with markers and popups using Leaflet.js.
// It includes functionality for displaying a photo carousel in popups, adding legends, and handling different map layers.
// It uses the PapaParse library for CSV parsing and Leaflet.js for map rendering, and handles international date line crossing by tripling markers.

// fetch data from JSON and CSV files
function fetchData() {
  return Promise.all([
    fetch("../../resources/data/overview.json").then(handleFetchResponseJSON),
    fetch("../../resources/data/Activity.csv").then(handleFetchResponseCSV),
    fetch("../../resources/data/Location.csv").then(handleFetchResponseCSV),
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

      // triple markers to handle international date line crossing
      const tripledData = tripledMarkers(overviewData);

      // create overlayMarkers for the map
      const markers = createMarkers(tripledData);
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
  const legendToggle = addLegend();
  legendToggle.addTo(mainMap);

  // event listeners for legend toggling
  mainMap.on("overlayremove", (eventLayer) => {
    if (eventLayer.name === "Markers") {
      mainMap.removeControl(legendToggle);
    }
  });

  mainMap.on("overlayadd", (eventLayer) => {
    if (eventLayer.name === "Markers") {
      legendToggle.addTo(mainMap);
    }
  });

  // set Leaflet attribution control to bottom left
  mainMap.attributionControl.setPosition("bottomleft");
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

// triple markers for international date line crossing
function tripledMarkers(data) {
  return data.flatMap((place) => {
    // ensure lng and lat are numbers
    // avoid concatenation of strings
    const lng = parseFloat(place.lng);
    const lat = parseFloat(place.lat);
    return [
      { ...place, lng, lat },
      { ...place, lng: lng + 360, lat },
      { ...place, lng: lng - 360, lat },
    ];
  });
}

// create initial markers and get bounds for initial map view
function createMarkers(data) {
  return L.featureGroup(data.map(addMarker));
}

function createBounds(data) {
  return L.featureGroup(data.map(addMarker)).getBounds();
}

// add markers to the map, with tooltip and popup
function addMarker(place) {
  const marker = createCircleMarker(place);
  marker.bindTooltip(createTooltipContent(place));
  marker.bindPopup(createPopupContent(place));
  initializePhotoCarousel(marker, place);
  return marker;
}

// create circle marker with color and radius based on attributes
function createCircleMarker(place) {
  // set marker color based on visit type, radius based on importance
  const isAcademic = place.visit_type === "school";
  const markerColor = isAcademic ? "#FFB400" : "#4CAF50";
  const radius = place.importance * 2;

  // create main marker
  const mainMarker = L.circleMarker([place.lat, place.lng], {
    radius,
    color: markerColor,
    fillColor: "#008A51",
    fillOpacity: 0.6,
    weight: 3,
  });

  // add home ring if it was a residence
  if (place.home) {
    const homeRing = L.circleMarker([place.lat, place.lng], {
      radius: radius + 1,
      color: "#FF0000",
      fillColor: "transparent",
      fillOpacity: 0,
      weight: 4,
    });
    return L.featureGroup([homeRing, mainMarker]);
  }

  return mainMarker;
}

// tooltip for hover
function createTooltipContent(place) {
  return `
    <div style="text-align: center;">
      <b>${place.location_name}</b><br>
      Click for more info
    </div>
  `;
}

// initialize photo carousel when popup is opened
function initializePhotoCarousel(marker, place) {
  marker.on("popupopen", () => {
    if (place.photos && place.photos.length > 0) {
      const photoSet = place.photos.map(
        (photo) => `static/images/${place.photo_album}/${photo}`
      );
      displayMultiplePhotos(photoSet, `carousel-${place.id}`);
    }
  });
}

// popup content for each marker
function createPopupContent(place) {
  // clone carousel template
  const template = document.querySelector("#carousel-template");
  const carouselElement = template.content.cloneNode(true);

  // set ID for photo carousel
  const carouselContainer = carouselElement.querySelector(
    ".carousel-container"
  );
  carouselContainer.id = `carousel-${place.id}`;

  // check if there are photos
  const carouselHTML =
    place.photos && place.photos.length > 0
      ? carouselContainer.outerHTML
      : `
          <div class="no-photos">
            <p>No photos available</p>
          </div>
        `;

  // icons, if applicable
  const globeIcon = '<i class="fas fa-globe globe-icon"></i>';
  const schoolIcon =
    place.visit_type === "school" ||
    place.location_name === "Washington, D.C." ||
    place.location_name === "Vermont"
      ? '<i class="fas fa-graduation-cap school-icon"></i>'
      : "";
  const homeIcon = place.home
    ? '<i class="fas fa-home home-icon"></i>'
    : "";

  // populate carousel template
  return `
    ${carouselHTML}
    <div class="popup-content">
      <h3>${globeIcon} ${homeIcon} ${schoolIcon} ${place.location_name}</h3>
      <p>${place.description}</p>
      <p>${place.notes}</p>
    </div>
  `;
}

// add activity markers
function addActivityMarkers(activityData, locationData) {
  // create layer for activity markers
  const activityLayer = L.layerGroup();
  // get location details for each activity
  const activityWithLocations = mapActivityLocations(
    activityData,
    locationData
  );
  // tripled the markers for international date line crossing
  const tripledActivities = tripledMarkers(activityWithLocations);

  // add markers to the activity layer
  tripledActivities.forEach((activity) => {
    // assign icon based on activity type
    const iconClass =
      activityIcons[activity.activity_type.toLowerCase()] || "fa-map-marker";
    // capitalize text for display
    const formattedActivityType = capitalizeWords(
      activity.activity_type.replace("_", " ")
    );

    // create icon
    const activityIcon = L.divIcon({
      html: `
        <span class="fa-stack fa-lg activity-icon-stack">
          <i class="fas fa-circle fa-stack-2x"></i>
          <i class="${iconClass} fa-stack-1x fa-inverse"></i>
        </span>
      `,
      className: "activity-icon",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // create marker, with tooltip and popup
    const marker = L.marker([activity.lat, activity.lng], {
      icon: activityIcon,
    });
    marker.bindTooltip(createTooltipContent(activity));
    marker.bindPopup(
      createActivityPopupContent(activity, formattedActivityType, iconClass)
    );
    activityLayer.addLayer(marker);
  });

  return activityLayer;
}

// map activities to their respective location data
function mapActivityLocations(activityData, locationData) {
  return activityData
    .map((activity) => {
      const location = locationData.find(
        (loc) => loc.location_id === activity.location_id
      );
      return location
        ? {
            ...activity,
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng),
            location_name: location.name,
          }
        : null;
    })
    .filter(Boolean);
}

// create popup content for activity markers
function createActivityPopupContent(
  activity,
  formattedActivityType,
  iconClass
) {
  return `
    <div>
      <h4>${activity.location_name}</h4>
      <p><b><i class="${iconClass}" style="color: #0085A1;"></i></b> ${formattedActivityType}</p>
      <p>${activity.description || "No description available."}</p>
    </div>
  `;
}

// add legend
function addLegend() {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "custom-legend");
    div.innerHTML = `
      <h4>Border Color</h4>
      <div><i class="fas fa-home home-icon"></i> Residence</div>
      <div><i class="fas fa-graduation-cap school-icon"></i> Academic</div>
      <div><i class="fas fa-globe globe-icon"></i> Other</div>
      <p>Markers scaled<br>by life impact</p>
    `;
    return div;
  };
  return legend;
}

// utility functions
function capitalizeWords(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// icon mapping for activity overlay
const activityIcons = {
  skiing: "fas fa-skiing",
  snorkeling: "fas fa-swimmer",
  whitewater_rafting: "fas fa-life-ring",
  hiking: "fas fa-hiking",
  paragliding: "fas fa-parachute-box",
  kayaking: "mdi mdi-kayaking",
};

// start everything - initialize the map
initializeMap();
