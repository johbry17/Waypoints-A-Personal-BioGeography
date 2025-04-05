// create initial markers and get bounds for initial map view
function createMarkers(data) {
  // triple markers to handle international date line crossing
  const tripledData = tripledMarkers(data);
  return L.featureGroup(tripledData.map(addMarker));
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
  mainMarker.on('mouseover', function() {
    this.setStyle({ radius: radius * 1.2, fillOpacity: 0.8 });
  });

  mainMarker.on('mouseout', function() {
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
    ? capitalizeWords(place.activity_type.replace("_", " "))
    : "";
  const iconClass = isActivity
    ? activityIcons[place.activity_type.toLowerCase()] || "fa-map-marker"
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
              ${iconClass ? `<i class="${iconClass} activity-icon-stack"></i>` : ""}
              ${place.name}
            </h3>
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
  whitewater_rafting: "fas fa-water",
  hiking: "fas fa-hiking",
  paragliding: "fas fa-parachute-box",
  kayaking: "mdi mdi-kayaking",
  tubing: "fas fa-life-ring",
};

// add activity markers
function addActivityMarkers(activityData) {
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
    const marker = L.marker([activity.lat, activity.lng], {
      icon: L.divIcon({
        html: `<span class="fa-stack fa-lg activity-icon-stack"><i class="fas fa-circle fa-stack-2x"></i><i class="${
          activityIcons[activity.activity_type.toLowerCase()] || "fa-map-marker"
        } fa-stack-1x fa-inverse"></i></span>`,
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

function createRouteLayers(routeData) {
  // sublayers for each route type
  const hikingLayer = L.layerGroup();
  const boatLayer = L.layerGroup();
  const trainLayer = L.layerGroup();
  const autoLayer = L.layerGroup();
  const planeLayer = L.layerGroup();

  // load polylines for each route type
  routeData.forEach(route => {
    // get file path for geoJSON
    const filePath = `resources/geojson/${route.filename}`;
    
    // fetch route data from GeoJSON
    fetch(filePath)
      .then(response => response.json())
      .then(geojson => {
        // triple the routes for international date line crossing
        const tripledGeoJSONs = tripledRoutes(geojson);
        // assign color and dashArray based on transport mode
        const { color, dashArray } = getRouteStyle(route.transport_mode);
        // set style for the route polylines
        tripledGeoJSONs.forEach(tripledGeoJSON => {
          const polyline = L.geoJSON(tripledGeoJSON, {
            // exclude points from the route, the map marker (for some train routes)
            filter: feature => feature.geometry.type !== "Point",
            style: {
              color: color,
              weight: 3,
              opacity: 0.8,
              dashArray: dashArray,
              lineCap: 'butt',
            },
          });

          // add routes to respective layers
          switch (route.transport_mode) {
            case "hike":
              hikingLayer.addLayer(polyline);
              break;
            case "boat":
              boatLayer.addLayer(polyline);
              break;
            case "train":
              trainLayer.addLayer(polyline);
              break;
            case "auto":
              autoLayer.addLayer(polyline);
              break;
            case "plane":
              planeLayer.addLayer(polyline);
              break;
          }
        });
      })
      .catch(error => console.error(`Failed to load GeoJSON file: ${route.filename}`, error));
  });

  // create parent layer for routes, add all sublayers
  const routeLayer = L.layerGroup([
    hikingLayer,
    boatLayer,
    trainLayer,
    autoLayer,
    planeLayer,
  ]);

  return {
    routeLayer,
    sublayers: {
      '<i class="fas fa-plane"></i> Planes': planeLayer,
      '<i class="fas fa-train"></i> Trains': trainLayer,
      '<i class="fas fa-car"></i> Automobiles': autoLayer,
      '<i class="fas fa-ship"></i> Boats': boatLayer,
      '<i class="fas fa-hiking"></i> Hikes': hikingLayer,      
    },
  };
}

// assign color and shape based on transport mode
function getRouteStyle(routeType) {
  switch (routeType) {
    case "hike":
      // return { color: "#228B22", dashArray: "5, 10" }; // dashed green
      return { color: "red", dashArray: null };
    case "boat":
      return { color: "#1E90FF", dashArray: "1, 15" }; // dotted blue
    case "train":
      return { color: "#8B0000", dashArray: "10, 5, 2, 5" }; // dash-dot red
      // return { color: "red", dashArray: null };
    case "auto":
      return { color: "#FF8C00", dashArray: null }; // solid orange
    case "plane":
      return { color: "#9400D3", dashArray: "20, 10" }; // long dashed purple
      // return { color: "red", dashArray: null };
    default:
      return { color: "#000000", dashArray: null }; // solid black line default
  }
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
      feature.geometry.coordinates = feature.geometry.coordinates.map(([lng, lat]) => [lng + offset, lat]);
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
