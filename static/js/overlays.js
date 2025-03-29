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
    // triple markers to handle international date line crossing
    const tripledData = tripledMarkers(data);
    return L.featureGroup(tripledData.map(addMarker));
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
    const homeIcon = place.home ? '<i class="fas fa-home home-icon"></i>' : "";
  
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
        <p>${activity.description}</p>
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