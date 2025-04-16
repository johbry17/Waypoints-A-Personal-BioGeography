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
  const markerColor = isAcademic ? colors.academic : colors.defaultMarker;
  const radius = place.importance * 2;

  // create main marker
  const mainMarker = L.circleMarker([place.lat, place.lng], {
    radius,
    color: markerColor,
    fillColor: colors.primaryColor,
    fillOpacity: 0.6,
    weight: 3,
  });

  // hover effect (enlarge / shrink marker and change opacity)
  mainMarker.on("mouseover", function () {
    animateRadius(this, radius, radius * 1.2, 300);
    this.setStyle({ fillOpacity: 0.8 });
  });
  
  mainMarker.on("mouseout", function () {
    animateRadius(this, radius * 1.2, radius, 300);
    this.setStyle({ fillOpacity: 0.6 });
  });

  // add home ring if it was a residence
  if (place.home) {
    const homeRing = L.circleMarker([place.lat, place.lng], {
      radius: radius + 1,
      color: colors.homeRing,
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
  // boolean check for activity type
  const isActivity = !!place.activity_type;

  // format text of activity type for display
  const formattedActivityType = isActivity
    ? capitalizeWords(place.activity_type)
    : "";

  // assign icons
  const homeIcon = place.home ? '<i class="fas fa-home home-icon"></i>' : "";
  const schoolIcon =
    place.visit_type === "school" ||
    place.name === "Washington, D.C." ||
    place.name === "Vermont"
      ? '<i class="fas fa-graduation-cap school-icon"></i>'
      : "";
  const activityIcon = isActivity
    ? activityIcons[(place.activity_type ?? "").toLowerCase()] ||
      "fas fa-map-marker"
    : "";
  const locationIcon = place.location_id
    ? locationIcons[(place.location_type ?? "").toLowerCase()] ||
      "fas fa-map-marker"
    : "fas fa-map-marker";

  // set icons
  const icons = isActivity
    ? `<i class="${activityIcon} activity-icon-stack"></i>`
    : place.location_id
    ? `<i class="${locationIcon} location-icon-stack"></i>`
    : `<i class="fas fa-globe globe-icon"></i> ${homeIcon} ${schoolIcon}`;

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

  // add zoom button to the popup
  const placeId = place.activity_id || place.id || place.location_id;
  const zoomButton = `
    <button class="zoom-button" onclick="zoomToArea('${placeId}')">
      <i class="fas fa-search-plus"></i> Zoom
    </button>
  `;

  // set border and arrow tip color by popup type
  const borderColor = isActivity
    ? colors.activityColor
    : place.location_id
    ? colors.locationColor
    : colors.primaryColor;

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

// add location markers
function addLocationMarkers(locationData) {
  // store place data globally for zoomToArea function
  locationData.forEach((place) => {
    const key = place.location_id;
    placeData[key] = place;
  });

  // tripled the markers for international date line crossing
  const tripledLocations = tripledMarkers(locationData);

  // create layer for location markers
  const locationLayer = L.layerGroup();
  // add markers to the location layer
  tripledLocations.forEach((location) => {
    const locationMarker = L.circleMarker([location.lat, location.lng], {
      radius: 2,
      color: colors.locationColor,
      fillColor: colors.academic,
      fillOpacity: 0.6,
      weight: 1,
    });

    // add tooltip and popup to the marker
    locationMarker.bindTooltip(createTooltipContent(location));
    locationMarker.bindPopup(createPopupContent(location));
    initializePhotoCarousel(locationMarker, location);
    locationLayer.addLayer(locationMarker);
  });
  return locationLayer;
}

//////////////////////////////////////////////////////////

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
    // load activity icon, or default to map marker icon
    const activityIcon =
      activityIcons[
        activity.activity_type.toLowerCase() || "fas fa-map-marker"
      ];
    const marker = L.marker([activity.lat, activity.lng], {
      icon: L.divIcon({
        html: `<span class="fa-stack fa-lg activity-icon-stack">
          <i class="fas fa-circle fa-stack-2x"></i>
          <i class="${activityIcon} fa-stack-1x fa-inverse"></i>
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

  // dummy layer for routes legend popup checkbox
  const legendIcon = L.layerGroup();
  legendIcon.onAdd = () => {};

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
      '<span id="legend-link"><i class="fas fa-question-circle"></i></span>':
        legendIcon,
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

// animates the scaling of the marker radius on hover
function animateRadius(marker, startRadius, endRadius, duration) {
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    // progess (0 to 1) based on elapsed time and duration
    const progress = Math.min(elapsed / duration, 1); // ensure progress doesn't exceed 1, end condition
    const currentRadius = startRadius + (endRadius - startRadius) * progress;

    marker.setStyle({ radius: currentRadius });

    // end condition for animation
    if (progress < 1) {
      requestAnimationFrame(step); // continue animation
    }
  }

  // start recursive animation loop
  requestAnimationFrame(step);
}

// optional function to add marker clusters for main markers
// function createMarkerCluster(data) {
//   let markerCluster = L.markerClusterGroup({
//     spiderfyOnMaxZoom: true,
//     showCoverageOnHover: false,
//     spiderLegPolylineOptions: { weight: 1.5, color: "#ffd700" },
//     maxClusterRadius: 50, // max cluster radius in pixels
//     zoomToBoundsOnClick: true,
//   });

//   // add markers to the cluster group
//   data.forEach((place) => {
//     let marker = addMarker(place);
//     markerCluster.addLayer(marker);
//   });

//   return markerCluster;
// }
