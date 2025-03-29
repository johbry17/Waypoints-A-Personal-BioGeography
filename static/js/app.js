fetch("../../resources/data/overview.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    // triple markers to handle international date line crossing
    const tripledData = tripledMarkers(data);

    // create markers and map
    let markers = L.featureGroup(tripledData.map(addMarker));
    // for initial map zoom level
    const originalBounds = L.featureGroup(data.map(addMarker)).getBounds();
    createMap(markers, originalBounds);
  });

// function to create base maps and layers
function createMap(markers, originalBounds) {
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
  let overlayMaps = {
    Markers: markers,
  };

  // create map
  let mainMap = L.map("map", {
    layers: [satMap, markers],
    // loads data when crossing the international date line
    worldCopyJump: true,
  });
  // set initial map zoom level and bounds
  mainMap.fitBounds(originalBounds);

  // create toggle for map layers
  L.control
    .layers(baseMap, overlayMaps, {
      // collapsed: false,
    })
    .addTo(mainMap);

  // call function to add legend to map
  let legendToggle = addLegend();
  legendToggle.addTo(mainMap);

  // remove legend if marker layer toggled off
  mainMap.on("overlayremove", function (eventLayer) {
    if (eventLayer.name === "Markers") {
      mainMap.removeControl(legendToggle);
    }
  });

  // add legend if marker layer toggled on
  mainMap.on("overlayadd", function (eventLayer) {
    if (eventLayer.name === "Markers") {
      legendToggle.addTo(mainMap);
    }
  });

  // set Leaflet attribution control to bottom left
  mainMap.attributionControl.setPosition("bottomleft");
}

// triples markers for crossing the international date line
function tripledMarkers(data) {
  const tripledData = [];

  data.forEach((place) => {
    // add original marker
    tripledData.push(place);

    // add longitude + 360
    tripledData.push({
      ...place,
      lng: place.lng + 360,
    });

    // add longitude - 360
    tripledData.push({
      ...place,
      lng: place.lng - 360,
    });
  });

  return tripledData;
}

// function to add markers to map
function addMarker(place) {
  const isAcademic = place.visit_type === "school";

  // set marker color based on visit type
  const markerColor = isAcademic ? "#FFB400" : "#4CAF50"; // yellow for school, green for others

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
    // extra red border ring for home markers
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

  // add home icon if it was a residence
  const homeIcon = place.home
    ? '<i class="fas fa-home home-icon" style="color: #FF5733;"></i>'
    : "";

  // add popup text
  const popupContent = `
    <div class="popup-content">
      <h3><i class="fas fa-globe"></i> ${homeIcon} ${schoolIcon} ${place.location_name}</h3>
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

function addLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "custom-legend");
    div.innerHTML = `
      <h4>Border Color</h4>
      <div><i class="fas fa-home home-icon" style="color: #FF5733;"></i> Residence</div>
      <div><i class="fas fa-graduation-cap" style="color: #FFB400;"></i> Academic</div>
      <div><i class="fas fa-globe" style="color: #4CAF50;"></i> Other</div>
      <p>Markers scaled<br>by life impact</p>
    `;
    return div;
  };

  return legend;
}
