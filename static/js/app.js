fetch("../../resources/data/overview.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    let markers = L.featureGroup(data.map(addMarker));
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

function addMarker(place) {
  // create marker for each place
  let marker = L.marker([place.lat, place.lng]);

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
  const carouselHTML =
    place.photos && place.photos.length > 0
      ? `
            <div class="carousel-container" id="carousel-${place.id}">
                <div class="carousel-photos"></div>
                <div class="carousel-controls">
                    <span id="prev-button" class="fa-stack fa-lg">
                        <i class="fas fa-circle fa-stack-2x"></i>
                        <i class="fas fa-chevron-left fa-stack-1x fa-inverse"></i>
                    </span>
                    <span id="play-pause-button" class="fa-stack fa-lg">
                        <i class="fas fa-circle fa-stack-2x"></i>
                        <i class="fas fa-pause fa-stack-1x fa-inverse"></i>
                    </span>
                    <span id="next-button" class="fa-stack fa-lg">
                        <i class="fas fa-circle fa-stack-2x"></i>
                        <i class="fas fa-chevron-right fa-stack-1x fa-inverse"></i>
                    </span>
                </div>
            </div>
        `
      : "<p>No photos available</p>";

  return `
        ${carouselHTML}
        <h3>${place.location_name}</h3>
        <p>${place.start_date} - ${place.end_date}</p>
        <p>${place.description}</p>
        <p>${place.notes}</p>
    `;
}
