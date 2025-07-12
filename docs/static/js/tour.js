// Description: This script sets up a guided tour using Shepherd.js
// It demonstrates features like layer toggling, marker interaction, and popups.
// It toggles certain UI elements to prevent user interactions...
// ... causing bugs and interfering with the tour.

// Table of Contents:

// the tour
// restart tour
// UI watcher
// highlight marker
// toggles (controls, layers, buttons)
// map reset

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

  window.tour = tour; // make tour accessible globally
  // ensure markers layer is added to the map (for highlightMarker)
  if (!mainMap.hasLayer(markers)) mainMap.addLayer(markers);

  // welcome message
  tour.addStep({
    id: "welcome",
    text: "Every marker here tells a story. This quick tour will show you how to explore them.",
    buttons: [{ text: "Next", action: tour.next }],
  });

  // map layers toggle
  tour.addStep({
    id: "layers-toggle",
    attachTo: { element: ".leaflet-control-layers-toggle", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Start here—tap or hover to open the map layers menu.",
    when: {
      show: () => {
        const control = document.querySelector(".leaflet-control-layers");
        if (control)
          observeClassToggle(
            control,
            "leaflet-control-layers-expanded",
            tour.next
          );
      },
    },
  });

  // map controls (opens on start, closes on Next button)
  tour.addStep({
    id: "layers-button",
    attachTo: { element: ".leaflet-control-layers", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Use this panel to toggle routes, markers, and map styles.",
    buttons: [
      {
        text: "Next",
        action: () => {
          toggleLayerControl(false); // close the layers menu
          tour.next();
        },
      },
    ],
    // disable the Waypoints layer toggle while this step is active
    when: {
      show: () => {
        toggleLayerControl(true); // open the layers menu
        setLayerToggleEnabled("Waypoints", false);
      },
      hide: () => setLayerToggleEnabled("Waypoints", true),
    },
  });

  // legend
  tour.addStep({
    id: "legend",
    attachTo: { element: "#map-legend", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "A key to the colors on the map.",
    buttons: [{ text: "Next", action: tour.next }],
  });

  // highlight a marker by name
  // add a one-time popup open event to advance the tour
  highlightMarker("Cape Town");
  mainMap.once("popupopen", () => tour.next());

  // advance the tour on marker click
  tour.addStep({
    id: "marker-demo",
    text: "This marks a place I passed through. Click to open a small window into it.",
    attachTo: { element: ".tour-marker", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
  });

  // popup
  tour.addStep({
    id: "popup-demo",
    text: "Each popup holds a glimpse—photos, a few lines of memory. Scroll through as you like.",
    attachTo: { element: ".leaflet-popup", on: "bottom" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 30] } }],
    },
    buttons: [{ text: "Next", action: tour.next }],
    // disable the zoom button while this step is active
    when: {
      show: () => disableButton(".zoom-button", true),
      hide: () => disableButton(".zoom-button", false),
    },
  });

  // zoom
  tour.addStep({
    id: "zoom-button",
    attachTo: { element: ".zoom-button", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 24] } }],
    },
    text: "Use this button to zoom closer and focus in on that location.",
    advanceOn: { selector: ".zoom-button", event: "click" },
  });

  // reset map
  tour.addStep({
    id: "reset-button",
    attachTo: { element: ".reset-map-button", on: "right" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "This resets the map to a bird’s-eye view—sometimes helpful to reorient.",
    advanceOn: { selector: ".reset-map-button", event: "click" },
  });

  // about button
  tour.addStep({
    id: "about-button",
    attachTo: { element: ".about-button", on: "right" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Want to know more about how and why this map exists? Click here for a bit of backstory.",
    advanceOn: { selector: ".about-button", event: "click" },
  });

  // The End (resets the map view)
  tour.addStep({
    id: "popup",
    attachTo: { element: ".tour-restart-button", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "That’s the overview. You can restart this tour anytime—but feel free to wander.",
    buttons: [
      {
        text: "Done",
        action: () => {
          tour.complete();
          closeModal(); // close About modal
        },
      },
    ],
    when: {
      show: () => {
        // scroll to restart button
        const btn = document.querySelector(".tour-restart-button");
        if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
        resetMapView(); // reset the map view
      },
    },
  });

  tour.start();
}

/////////////////////////////////////////////////////////////////////

// restarts the tour from the About modal
function restartTour() {
  if (window.tour?.complete) window.tour.complete(); // if tour is active
  closeModal(); // close About modal
  setTimeout(() => startMapTour(), 500);
}

/////////////////////////////////////////////////////////////////////

// UI watcher - watches for the layers panel to open
// watches for a class to toggle, then calls callback function
function observeClassToggle(el, className, callback) {
  const observer = new MutationObserver((mutations) => {
    if (
      [...mutations].some(
        (m) => m.type === "attributes" && el.classList.contains(className)
      )
    ) {
      observer.disconnect();
      callback();
    }
  });
  observer.observe(el, { attributes: true, attributeFilter: ["class"] });
}

///////////////////////////////////////////////////////////////////

// highlights a marker by adding a class to its SVG path
function highlightMarker(name) {
  const place = Object.values(placeData).find((p) =>
    p.name?.toLowerCase().includes(name.toLowerCase())
  );

  let marker = place?.marker;
  if (marker instanceof L.FeatureGroup) {
    marker = marker.getLayers().find((m) => m instanceof L.CircleMarker);
  }
  if (marker?._path) {
    marker._path.classList.add("tour-marker");
  }
}

//////////////////////////////////////////////////////////////////////

// toggles the layer control panel open or closed
function toggleLayerControl(open = true) {
  const toggle = document.querySelector(".leaflet-control-layers-toggle");
  const control = document.querySelector(".leaflet-control-layers");
  if (toggle && control) {
    const isOpen = control.classList.contains(
      "leaflet-control-layers-expanded"
    );
    if ((open && !isOpen) || (!open && isOpen)) toggle.click();
  }
}

// enables or disables a layer toggle by label (Waypoints layer)
function setLayerToggleEnabled(layerLabel, enabled = true) {
  const labels = document.querySelectorAll(
    ".leaflet-control-layers-overlays label"
  );
  for (const label of labels) {
    if (label.textContent.trim().includes(layerLabel)) {
      const input = label.querySelector("input[type='checkbox']");
      if (input) input.disabled = !enabled;
    }
  }
}

// disable a button and gray it out (zoom button)
function disableButton(selector, disable = true) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.toggleAttribute("disabled", disable);
    btn.classList.toggle("disabled-gray", disable);
  }
}

//////////////////////////////////////////////////////////////

// resets the map view to the initial state
function resetMapView() {
  // reset basemap
  const baseLayer = createBaseMaps().Satellite;
  baseLayer.addTo(mainMap);

  // remove any other base layers (just to be safe)
  Object.values(mainMap._layers).forEach((layer) => {
    if (layer instanceof L.TileLayer && layer !== baseLayer) {
      mainMap.removeLayer(layer);
    }
  });

  // remove all other layers except the base layer, legend, and overlay pane
  mainMap.eachLayer((layer) => {
    if (![baseLayer, legend, mainMap._panes.overlayPane].includes(layer)) {
      mainMap.removeLayer(layer);
    }
  });

  // show waypoint markers
  if (!mainMap.hasLayer(markers)) mainMap.addLayer(markers);
}
