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
  const isActivity = !!place.activity_type;
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
    place.location_name === "Washington, D.C." ||
    place.location_name === "Vermont"
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
      : `<div class="no-photos"><p>No photos available</p></div>`;
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
            <h3>${icons} ${
    iconClass ? `<i class="${iconClass} activity-icon-stack"></i>` : ""
  } ${place.location_name}</h3>
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
  whitewater_rafting: "fas fa-life-ring",
  hiking: "fas fa-hiking",
  paragliding: "fas fa-parachute-box",
  kayaking: "mdi mdi-kayaking",
};

// add activity markers
function addActivityMarkers(activityData, locationData) {
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

  // get location details for each activity
  const activityWithLocations = mapActivityLocations(
    activityData,
    locationData
  );
  // tripled the markers for international date line crossing
  const tripledActivities = tripledMarkers(activityWithLocations);

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

////////////////////////////////////////////////////////////

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

// optional function to add marker clusters
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
