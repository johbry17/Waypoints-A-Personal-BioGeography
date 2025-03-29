fetch("../../resources/data/overview.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    // toggle between marker clusters and markers
    // let markers = createMarkerCluster(data); // create marker clusters
    let markers = L.featureGroup(data.map(addMarker)); // create markers
    createMap(markers);
  });

// function to create base maps and layers
function createMap(markers) {
  // create base layer
  let satMap = L.esri.basemapLayer("Imagery");

  // create objects to hold the base maps...
  let baseMap = {
    Satellite: satMap,
    "National Geographic": L.esri.basemapLayer("NationalGeographic"),
    Physical: L.esri.basemapLayer("Physical"),
    Oceans: L.esri.basemapLayer("Oceans"),
    Grayscale: L.esri.basemapLayer("Gray"),
    Firefly: L.esri.basemapLayer("ImageryFirefly"),
  };
  // ...and overlay maps
  let maps = {
    Markers: markers,
  };

  // create map with center, zoom, initial layers
  let mainMap = L.map("map", {
    // center: [0, -60],
    // zoom: 3,
    layers: [satMap, markers],
    // loads data when crossing the international date line
    worldCopyJump: true,
  });
  mainMap.fitBounds(markers.getBounds()); // fit map to markers

  // create toggle for map layers
  L.control
    .layers(baseMap, maps, {
      // collapsed: false,
    })
    .addTo(mainMap);

  // // call function to add legend to map
  // let legendToggle = addLegend();
  // legendToggle.addTo(mainMap);

  // // remove legend if earthquake layer toggled off
  // mainMap.on("overlayremove", function (eventLayer) {
  //   if (eventLayer.name === "Markers") {
  //     mainMap.removeControl(legendToggle);
  //   }
  // });

  // // add legend if earthquake layer toggled on
  // mainMap.on("overlayadd", function (eventLayer) {
  //   if (eventLayer.name === "Markers") {
  //     legendToggle.addTo(mainMap);
  //   }
  // });

  // set Leaflet attribution control to bottom left
  mainMap.attributionControl.setPosition("bottomleft");
}

// // optional function to add marker clusters
// function createMarkerCluster(data) {
//   let markerCluster = L.markerClusterGroup({
//     spiderfyOnMaxZoom: true,
//     showCoverageOnHover: false,
//     spiderLegPolylineOptions: { weight: 1.5, color: "#ffd700" },
//     maxClusterRadius: 50,
//     zoomToBoundsOnClick: true,
//   });

//   // add markers to the cluster group
//   data.forEach((place) => {
//     let marker = addMarker(place);
//     markerCluster.addLayer(marker);
//   });

//   return markerCluster;
// }

// function to add markers to map
function addMarker(place) {
  const isEducational = place.visit_type === "school";

  // set marker color based on visit type
  const markerColor = isEducational ? "#4CAF50" : "#FFB400"; // green for school, yellow for others

  // set radius based on importance
  const radius = place.importance * 2;

  // create marker for each place
  let mainMarker = L.circleMarker([place.lat, place.lng], {
    radius: radius,
    color: markerColor,
    fillColor: "#008A51",
    fillOpacity: 0.6,
    weight: 3,
  });

  // if "home" marker
  if (place.home) {
    // extra border ring for home markers
    const homeRing = L.circleMarker([place.lat, place.lng], {
      radius: radius + 1, // slightly larger radius for the ring
      color: "#FF0000",
      fillColor: "transparent",
      fillOpacity: 0,
      weight: 4,
    });

    // group main marker and home ring
    marker = L.featureGroup([homeRing, mainMarker]);
  } else {
    // for non-home markers
    marker = mainMarker;
  }

  // tooltip for hover
  marker.bindTooltip(
    `<div style="text-align: center;">
      <b>${place.location_name}</b><br>
      Click for more info
     </div>`,
    {
      permanent: false,
      direction: "top",
    }
  );

  // create popup for each marker
  marker.bindPopup(createPopupContent(place));

  // initialize carousel on popup open
  marker.on("popupopen", () => {
    const photoSet = place.photos.map(
      (photo) => `static/images/${place.photo_album}/${photo}`
    );
    displayMultiplePhotos(photoSet, `carousel-${place.id}`);
  });

  // return markers for layer
  return marker;
}

function createPopupContent(place) {
  // clone carousel template
  const template = document.querySelector("#carousel-template");
  const carouselElement = template.content.cloneNode(true);

  // set ID for photo carousel
  const carouselContainer = carouselElement.querySelector(
    ".carousel-container"
  );
  carouselContainer.id = `carousel-${place.id}`;

  // add school icon if visit_type was academic, including D.C. and Vermont
  const schoolIcon =
    place.visit_type === "school" ||
    place.location_name === "Washington, D.C." ||
    place.location_name === "Vermont"
      ? '<i class="fas fa-graduation-cap school-icon"></i>'
      : "";

  // add popup text
  const popupContent = `
    <div class="popup-content">
      <h3><i class="fas fa-globe"></i> ${schoolIcon} ${place.location_name}</h3>
      <p>${place.description}</p>
      <p>${place.notes}</p>
    </div>
  `;

  // return photo carousel and popup content
  return `
    ${carouselContainer.outerHTML}
    ${popupContent}
  `;
}
