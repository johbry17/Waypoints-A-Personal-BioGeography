// Description: This file contains functions to create and manage map overlays, including markers, routes, and popups.

// create initial markers and get bounds for initial map view
function createMarkers(data) {
  // store place data globally for zoomToArea function
  data.forEach((place) => {
    const key = place.id;
    placeData[key] = place;
  });

  // triple markers to handle international date line crossing
  const tripledData = tripledMarkers(data);
  return L.featureGroup(tripledData.map(addMarker));
  // can experiment with marker clusters here
  // but the homeRing is treated as a separate marker
  // triggering spiderfy and cascading muck-ups with createBounds, blah blah blah
  // return createMarkerCluster(tripledData);
}

function createBounds(data) {
  return L.featureGroup(data.map(addMarker)).getBounds();
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

//////////////////////////////////////////////////////////

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

  // hover effect
  mainMarker.on("mouseover", function () {
    this.setStyle({ radius: radius * 1.2, fillOpacity: 0.8 });
  });

  mainMarker.on("mouseout", function () {
    this.setStyle({ radius, fillOpacity: 0.6 });
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

//////////////////////////////////////////////////////////

// tooltip for hover
function createTooltipContent(place) {
  return `
      <div class="hover-tooltip-content">
        <b>${place.name}</b><br>
        Click for more info
      </div>
    `;
}

// initialize photo carousel when popup is opened
function initializePhotoCarousel(marker, place) {
  marker.on("popupopen", () => {
    if (place.photos && place.photos.length > 0) {
      // ensure `photos` is an array
      const photos = Array.isArray(place.photos)
        ? place.photos
        : [place.photos];
      // create photo paths
      const photoSet = photos.map(
        (photo) => `static/images/${place.photo_album}/${photo}`
      );
      displayMultiplePhotos(photoSet, `carousel-${place.id}`);
    }
  });
}

// popup content for each marker
function createPopupContent(place) {
  // for activity markers, format text and icon
  const isActivity = !!place.activity_type; // boolean check for activity type
  const formattedActivityType = isActivity
    ? capitalizeWords(place.activity_type)
    : "";
  const iconClass = isActivity
    ? activityIcons[place.activity_type.toLowerCase()] || "fas fa-map-marker"
    : "";

  // regular marker icons, if applicable
  const homeIcon = place.home ? '<i class="fas fa-home home-icon"></i>' : "";
  const schoolIcon =
    place.visit_type === "school" ||
    place.name === "Washington, D.C." ||
    place.name === "Vermont"
      ? '<i class="fas fa-graduation-cap school-icon"></i>'
      : "";
  const icons = !isActivity
    ? `<i class="fas fa-globe globe-icon"></i> ${homeIcon} ${schoolIcon}`
    : "";

  // create carousel for photos, if applicable
  const template = document.querySelector("#carousel-template");
  const carouselElement = template.content.cloneNode(true);
  const carouselContainer = carouselElement.querySelector(
    ".carousel-container"
  );
  carouselContainer.id = `carousel-${place.id}`;

  // if photos, add the carousel to the popup, else add a message
  const carouselHTML =
    place.photos && place.photos.length > 0
      ? carouselContainer.outerHTML
      : `<div class="no-photos"><p><i class="fas fa-camera"></i> No photos available</p></div>`;
  //   : "";

  const placeId = place.activity_id || place.id;
  const zoomButton = `
  <button class="zoom-button" onclick="zoomToArea('${placeId}')">
    <i class="fas fa-search-plus"></i> Zoom
  </button>
`;

  // set border and arrow tip color by popup type
  const borderColor = isActivity ? "#0085a1" : "#008a51";

  return `
        <style>
        .leaflet-popup-content-wrapper {
            border-color: ${borderColor} !important;
        }
        .leaflet-popup-tip {
            background-color: ${borderColor} !important;
        }
        </style>
        ${carouselHTML}
        <div class="popup-content">
            <h3>
              ${icons}
              ${
                iconClass
                  ? `<i class="${iconClass} activity-icon-stack"></i>`
                  : ""
              }
              ${place.name}
            </h3>
            ${zoomButton}
            <h4>${formattedActivityType}</h4>
            <p>${place.description || ""}</p>
            <p>${place.notes || ""}</p>
        </div>
    `;
}

//////////////////////////////////////////////////////////

// icon mapping for activity overlay
const activityIcons = {
  skiing: "fas fa-skiing",
  snorkeling: "fas fa-swimmer",
  "whitewater rafting": "fas fa-water",
  hiking: "fas fa-hiking",
  paragliding: "fas fa-parachute-box",
  kayaking: "mdi mdi-kayaking",
  tubing: "fas fa-life-ring",
  meditation: "mdi mdi-meditation",
  safari: "fas fa-paw",
  "scenic flight": "mdi mdi-airplane",
};

// add activity markers
function addActivityMarkers(activityData) {
  // store place data globally for zoomToArea function
  activityData.forEach((place) => {
    const key = place.activity_id;
    placeData[key] = place;
  });

  // !! toggle between marker and cluster layer !!
  // create layer for activity markers
  // const activityLayer = L.layerGroup();
  // create marker cluster layer for activities
  const activityLayer = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    spiderLegPolylineOptions: { weight: 1.5, color: "#ffd700" }, // never used
    maxClusterRadius: 20, // max cluster radius in pixels
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount(); // number of markers in cluster
      return L.divIcon({
        html: `<div class="custom-cluster-icon">${count}</div>`,
        className: "custom-cluster",
        // iconSize: [25, 25],
        iconSize: null, // seems to offset the icon a bit from the main markers
      });
    },
  });

  // // tripled the markers for international date line crossing
  const tripledActivities = tripledMarkers(activityData);

  // add markers to the activity layer
  tripledActivities.forEach((activity) => {
    const iconClass =
      activityIcons[
        activity.activity_type.toLowerCase() || "fas fa-map-marker"
      ];
    const marker = L.marker([activity.lat, activity.lng], {
      icon: L.divIcon({
        html: `<span class="fa-stack fa-lg activity-icon-stack">
          <i class="fas fa-circle fa-stack-2x"></i>
          <i class="${iconClass} fa-stack-1x fa-inverse"></i>
        </span>`,
        className: "activity-icon",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    });

    // add tooltip and popup to the marker
    marker.bindTooltip(createTooltipContent(activity));
    marker.bindPopup(createPopupContent(activity));
    initializePhotoCarousel(marker, activity);
    activityLayer.addLayer(marker);
  });

  return activityLayer;
}

//////////////////////////////////////////////////////////

// centralized route styles
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

// assign color and shape based on transport mode
function getRouteStyle(routeType) {
  return routeStyles[routeType] || routeStyles.default;
}

function createRouteLayers(routeData) {
  // sublayers for each route type
  const layers = {
    hike: L.layerGroup(),
    boat: L.layerGroup(),
    train: L.layerGroup(),
    auto: L.layerGroup(),
    plane: L.layerGroup(),
  };

  // load polylines for each route type
  routeData.forEach((route) => {
    // get file path for geoJSON and fetch data
    const filePath = `resources/geojson/${route.filename}`;
    fetch(filePath)
      .then((response) => response.json())
      .then((geojson) => {
        // triple the routes for international date line crossing
        const tripledGeoJSONs = tripledRoutes(geojson);
        // get color, weight, and dashArray based on transport mode
        const style = getRouteStyle(route.transport_mode);
        // set style for the route polylines
        tripledGeoJSONs.forEach((tripledGeoJSON) => {
          const polyline = L.geoJSON(tripledGeoJSON, {
            // exclude points from the route, the map marker (for some train routes)
            filter: (feature) => feature.geometry.type !== "Point",
            style: {
              color: style.color,
              weight: style.weight,
              opacity: 0.8,
              dashArray: style.dashArray,
              lineCap: "round",
              lineJoin: "round",
            },
          });

          // add routes to respective layers
          layers[route.transport_mode]?.addLayer(polyline);
        });
      })
      .catch((error) =>
        console.error(`Failed to load GeoJSON file: ${route.filename}`, error)
      );
  });

  // assign parent layer to global constant (for popup zoom), add all sublayers
  routeLayer = L.layerGroup(Object.values(layers));
  return {
    routeLayer,
    sublayers: {
      '<i class="fas fa-plane"></i>': layers.plane,
      '<i class="fas fa-train"></i>': layers.train,
      '<i class="fas fa-car"></i>': layers.auto,
      '<i class="fas fa-ship"></i>': layers.boat,
      '<i class="fas fa-hiking"></i>': layers.hike,
    },
  };
}

// triple routes for international date line crossing
function tripledRoutes(geojson) {
  return [
    geojson, // original route
    shiftGeoJSON(geojson, 360), // +360 degrees
    shiftGeoJSON(geojson, -360), // -360 degrees
  ];
}

// shift geoJSON coordinates by longitude offset
function shiftGeoJSON(geojson, offset) {
  // deep copy geoJSON to avoid modifying the original
  const shiftedGeoJSON = JSON.parse(JSON.stringify(geojson));
  shiftedGeoJSON.features.forEach((feature) => {
    if (feature.geometry.type === "LineString") {
      feature.geometry.coordinates = feature.geometry.coordinates.map(
        ([lng, lat]) => [lng + offset, lat]
      );
    } else if (feature.geometry.type === "MultiLineString") {
      feature.geometry.coordinates = feature.geometry.coordinates.map((line) =>
        line.map(([lng, lat]) => [lng + offset, lat])
      );
    }
  });
  return shiftedGeoJSON;
}

//////////////////////////////////////////////////////////

// utility functions
function capitalizeWords(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// for popup's zoom button
function zoomToArea(placeId) {
  // retrieve place object from global data
  const place = placeData[placeId];
  if (!place) {
    console.error("Place not found for ID:", placeId);
    return;
  }

  // close any open popup before zooming
  mainMap.closePopup();

  // if activity with route_path, zoom to the lat/lng of the place
  if (place.activity_type && place.route_path) {
    mainMap.setView([place.lat, place.lng], 12);
    ensureRouteLayer();
  } else if (place.zoomBounds) {
    // zoom to bounds if defined
    mainMap.fitBounds(place.zoomBounds);
    ensureRouteLayer();
  } else if (place.zoomLevel) {
    // zoom to specified zoom level if defined
    mainMap.setView(
      [place.lat, place.lng],
      place.zoomLevel || 12 // default zoom level
    );
    ensureRouteLayer();
  } else if (place.lat && place.lng) {
    // fallback: zoom to lat/lng, no routeLayer toggle
    mainMap.setView([place.lat, place.lng], 12);
  } else {
    console.error("No valid data to zoom to for this place:", place);
  }
}

// helper function to ensure routeLayer is added to the map on zoom
function ensureRouteLayer() {
  if (!mainMap.hasLayer(routeLayer)) {
    routeLayer.addTo(mainMap);
  }
}

// optional function to add marker clusters for activity markers
function createMarkerCluster(data) {
  let markerCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    spiderLegPolylineOptions: { weight: 1.5, color: "#ffd700" },
    maxClusterRadius: 50, // max cluster radius in pixels
    zoomToBoundsOnClick: true,
  });

  // add markers to the cluster group
  data.forEach((place) => {
    let marker = addMarker(place);
    markerCluster.addLayer(marker);
  });

  return markerCluster;
}
