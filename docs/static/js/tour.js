// Description: This script sets up a guided tour using Shepherd.js
// It demonstrates features like layer toggling, marker interaction, and popups.

// restarts the tour from the About modal
function restartTour() {
  if (window.tour && typeof window.tour.complete === "function") {
    window.tour.complete(); // if tour is active
  }
  closeModal(); // close About modal
  setTimeout(() => startMapTour(), 500);
}

// Shepherd.js tour setup
function startMapTour() {
  window.tour = new Shepherd.Tour({
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
    buttons: [{ text: "Next", action: tour.next }],
  });

  // map layers toggle
  tour.addStep({
    id: "layers-toggle",
    attachTo: {
      element: ".leaflet-control-layers-toggle",
      on: "left",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Tap / hover to open the map layers menu.",
    when: {
      show: () => {
        const control = document.querySelector(".leaflet-control-layers");
        if (control) {
          // watch for leaflet-control-layers-expanded class
          const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
              if (
                mutation.type === "attributes" &&
                control.classList.contains("leaflet-control-layers-expanded")
              ) {
                observer.disconnect();
                tour.next();
                break;
              }
            }
          });
          observer.observe(control, {
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      },
      hide: () => {
        // Clean up observer if the step is hidden before advancing
      },
    },
  });

  // map controls (opens on start, closes on Next button)
  tour.addStep({
    id: "layers-button",
    attachTo: {
      element: ".leaflet-control-layers",
      on: "left",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Use this menu to toggle which map layers are visible.",
    buttons: [
      {
        text: "Next",
        action: () => {
          const control = document.querySelector(".leaflet-control-layers");
          if (control?.classList.contains("leaflet-control-layers-expanded")) {
            control.classList.remove("leaflet-control-layers-expanded");
          }
          tour.next();
        },
      },
    ],
    // ensure the layers menu is open
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
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Here’s the legend.",
    buttons: [{ text: "Next", action: tour.next }],
  });

  // tour marker
  // first, add a class to a specific tour marker (.includes("...") below)
  const place = Object.values(placeData).find(
    (p) => p.name && p.name.toLowerCase().includes("cape town")
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

  // second, add a one-time listener for popupopen to advance the tour
  mainMap.once("popupopen", function () {
    tour.next();
  });

  // third and final, highlight the tour marker
  tour.addStep({
    id: "marker-demo",
    text: "Click this marker to open a popup.",
    attachTo: {
      element: ".tour-marker",
      on: "top",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
  });

  // popup
  tour.addStep({
    id: "popup-demo",
    text: "Note the photo reel controls.",
    attachTo: {
      element: ".leaflet-popup",
      on: "bottom",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, -20] } }],
    },
    buttons: [{ text: "Next", action: tour.next }],
    when: {
      show: () => {
        const zoomBtn = document.querySelector(".zoom-button");
        if (zoomBtn) zoomBtn.setAttribute("disabled", "disabled");
      },
      hide: () => {
        const zoomBtn = document.querySelector(".zoom-button");
        if (zoomBtn) zoomBtn.removeAttribute("disabled");
      },
    },
  });

  // zoom
  tour.addStep({
    id: "zoom-button",
    attachTo: {
      element: ".zoom-button",
      on: "top",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 24] } }],
    },
    text: "Click to zoom in on the popup's location.",
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
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Click to reset the map view.",
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
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "This opens a modal with background on the project.",
    advanceOn: { selector: ".about-button", event: "click" },
  });

  // The End
  tour.addStep({
    id: "popup",
    attachTo: {
      element: ".tour-restart-button",
      on: "top",
    },
    text: "You can restart the tour at any time. The map will reset.<br><br>Enjoy exploring!",
    buttons: [
      {
        text: "Done",
        action: () => {
          tour.complete();
          closeModal();
        },
      },
    ],
    when: {
      show: () => {
        const btn = document.querySelector(".tour-restart-button");
        if (btn) {
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    },
  });

  tour.start();
}
