// Shepherd.js tour setup
function startMapTour() {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true },
      modalOverlayOpeningPadding: 5,
      modalOverlayOpeningRadius: 5,
    },
  });

  // welcome message
  tour.addStep({
    id: "welcome",
    text: "Welcome! Let me show you how to explore this map.",
    buttons: [
      {
        text: "Next",
        action: tour.next,
      },
    ],
  });

  // map controls
  tour.addStep({
    id: "layers-button",
    attachTo: {
      element: ".leaflet-control-layers", // attaches to the persistent container
      on: "left",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 16],
          },
        },
      ],
    },
    text: "Use this to toggle which map layers are visible.",
    buttons: [
      { text: "Back", action: tour.back },
      { text: "Next", action: tour.next },
    ],
    when: {
      show: () => {
        const toggle = document.querySelector(".leaflet-control-layers-toggle");
        if (toggle) toggle.click();
      },
    },
  });

  // legend
  tour.addStep({
    id: "legend",
    attachTo: {
      element: "#map-legend",
      on: "left",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 16],
          },
        },
      ],
    },
    text: "Here’s the legend that explains icon meanings.",
    buttons: [
      { text: "Back", action: tour.back },
      { text: "Next", action: tour.next },
    ],
  });

  // tour marker
  // first, add a class to a specific tour marker (.includes("...") below)
  const place = Object.values(placeData).find(
    (p) => p.name && p.name.toLowerCase().includes("costa rica")
  );
  let marker = place && place.marker;
  if (marker && marker instanceof L.FeatureGroup) {
    marker = marker.getLayers().find((m) => m instanceof L.CircleMarker);
  }
  setTimeout(() => {
    if (marker && marker._path) {
      marker._path.classList.add("tour-marker");
    }
  }, 100);

  // then, add a one-time listener for popupopen to advance the tour
  mainMap.once("popupopen", function () {
    tour.next();
  });

  // and, highlight the tour marker
  tour.addStep({
    id: "marker-demo",
    text: "Click this marker to open a popup.",
    attachTo: {
      element: ".tour-marker",
      on: "top",
    },
    buttons: [{ text: "Back", action: tour.back }],
  });

  // popup
  tour.addStep({
    id: "popup-demo",
    text: "Here's a popup! You can use the photo reel controls.",
    attachTo: {
      element: ".leaflet-popup",
      on: "bottom",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 40],
          },
        },
      ],
    },
    buttons: [{ text: "Next", action: tour.next }],
  });

  // zoom
  tour.addStep({
    id: "zoom-button",
    attachTo: {
      element: ".zoom-button",
      on: "top",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 24],
          },
        },
      ],
    },
    text: "Click here to zoom in on the map.",
    advanceOn: { selector: ".zoom-button", event: "click" },
  });

  // reset map
  tour.addStep({
    id: "reset-button",
    attachTo: {
      element: ".reset-map-button",
      on: "right",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 16],
          },
        },
      ],
    },
    text: "Click here to reset the map to the global view.",
    advanceOn: { selector: ".reset-map-button", event: "click" },
  });

  // about button
  tour.addStep({
    id: "about-button",
    attachTo: {
      element: ".about-button",
      on: "right",
    },
    popperOptions: {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 16],
          },
        },
      ],
    },
    text: "This opens a modal with background on the project.",
    buttons: [{ text: "Next", action: tour.next }],
  });

  // The End
  tour.addStep({
    id: "popup",
    text: "Now try clicking on a map marker to open a popup with photos and details.",
    buttons: [
      {
        text: "Done",
        action: tour.complete,
      },
    ],
  });

  tour.start();
}

// modal.addEventListener("click", () => {
//   // assuming modal is closed at this point
//   setTimeout(() => startMapTour(), 1000);
// });
