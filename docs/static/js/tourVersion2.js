// tourVersion2.js — Guided Journey for Waypoints
//
// Drop-in replacement for tour.js. Exports startMapTour() and restartTour()
// for use by app.js (welcome modal) and index.html (About modal restart button).
//
// Architecture:
//   • Single Shepherd tour, useModalOverlay: false throughout
//   • Transparent interaction blocker div during automated steps
//     (prevents accidental user interaction without visually dimming the map)
//   • Dark visual dim overlay during the waypoint-choice step only
//     (pointer-events: none — purely visual; waypointsPane raised above it
//     so all markers remain clearly visible and clickable)
//   • Any waypoint click advances the tour; no specific marker required
//   • All advancement uses step-scoped timers so stale callbacks never
//     fire tour.next() on the wrong step
//   • Route-type demo NEVER removes routeLayer — only individual sublayers
//     are toggled, keeping routeControls visible throughout
//
// Table of Contents:
//   tour state
//   public entry points     — startMapTour(), restartTour()
//   map reset               — resetMapForTour()
//   timer helpers           — _tourTimeout(), _nextStep(), _clearTourTimers()
//   interaction blocking    — _addInteractionBlocker(), _removeInteractionBlocker()
//   dim overlay             — _addDimOverlay(), _removeDimOverlay(), setLayerToggleEnabled()
//   layer control           — _openLayersControl(), _closeLayersControl()
//   basemap / overlay       — _switchBasemap(), _setOverlay()
//   route sublayers         — _getRouteSublayers(), _showOnlyRouteSublayer(),
//                              _restoreAllRoutes(), _restoreAllRoutesIfActive(),
//                              _openRouteLegend(), _closeRouteLegend()
//   waypoint listener       — _cleanupWaypointListener()
//   cleanup                 — _cleanupTourState()
//   main tour               — _runTour()

/////////////////////////////////////////////////////////////////////////////
// Tour state

let tourCancelled = false;
let tourTimers = []; // all pending setTimeout IDs for cleanup
let interactionBlocker = null; // invisible click-blocking div
let dimOverlay = null; // dark visual overlay for waypoint-choice step
let _waypointPopupHandler = null; // popupopen listener reference for cleanup

/////////////////////////////////////////////////////////////////////////////
// Public entry points

// Called by app.js after the welcome modal is dismissed.
function startMapTour() {
  tourCancelled = false;
  resetMapForTour();
  _runTour();
}

// Called from index.html: onclick="restartTour()" on the About modal button.
function restartTour() {
  if (window.tour) {
    tourCancelled = true;
    window.tour.cancel(); // fires tour.on('cancel') → cleanup + reset
  }
  closeModal(); // close the About modal
  _cleanupTourState();
  setTimeout(() => {
    tourCancelled = false;
    resetMapForTour();
    _runTour();
  }, 400);
}

/////////////////////////////////////////////////////////////////////////////
// Map reset

// Restores the map to canonical initial state:
// Satellite basemap, Waypoints on, Activities and Routes off,
// initial bounds, popup closed.
// Called at tour start, on cancel, and on normal completion.
function resetMapForTour() {
  if (!mainMap) return;

  mainMap.closePopup();

  // Reset bounds via the existing reset button
  document.querySelector(".reset-map-button")?.click();

  // Restore Satellite basemap via the layer control radio button
  _switchBasemap("Satellite");

  // Turn off Activities and Routes through the layer control first.
  // This keeps the UI and application state synchronized.
  _setOverlay("Activities", false);
  _setOverlay("Routes", false);

  // Defensive cleanup: popup zoom can add routeLayer directly without
  // updating the Routes checkbox. Make absolutely certain no routes remain.
  if (routeLayer && mainMap.hasLayer(routeLayer)) {
    mainMap.removeLayer(routeLayer);
  }

  // Make sure all individual route sublayers are also off.
  const routeSubs = _getRouteSublayers();
  Object.values(routeSubs).forEach((layer) => {
    if (layer && mainMap.hasLayer(layer)) {
      mainMap.removeLayer(layer);
    }
  });

  // Reset route legend state (turn off).
  isLegendChecked = false;
  const legendPopup = document.getElementById("routes-legend-popup");
  if (legendPopup) {
    legendPopup.classList.add("hidden");
  }

  // Ensure Waypoints layer is present
  if (markers && !mainMap.hasLayer(markers)) mainMap.addLayer(markers);
}

/////////////////////////////////////////////////////////////////////////////
// Timer helpers

// Step-scoped setTimeout: callback only fires if the tour is still on stepId.
// Prevents stale timers from advancing the wrong step.
function _tourTimeout(stepId, fn, delay) {
  const id = setTimeout(() => {
    if (tourCancelled) return;
    if (window.tour?.getCurrentStep()?.id !== stepId) return;
    fn();
  }, delay);
  tourTimers.push(id);
  return id;
}

// Advance the tour only if we are still on the expected step.
function _nextStep(expectedStepId) {
  if (tourCancelled) return;
  if (window.tour?.getCurrentStep()?.id === expectedStepId) {
    window.tour.next();
  }
}

// Cancel all pending timers.
function _clearTourTimers() {
  tourTimers.forEach((id) => clearTimeout(id));
  tourTimers = [];
}

/////////////////////////////////////////////////////////////////////////////
// Interaction blocking

// Invisible full-screen div that catches all mouse events during automated
// steps. Shepherd dialogs (z-index 9999) remain accessible above it.
function _addInteractionBlocker() {
  if (interactionBlocker) return;
  interactionBlocker = document.createElement("div");
  interactionBlocker.id = "tour-v2-blocker";
  Object.assign(interactionBlocker.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "8000",
    cursor: "default",
    pointerEvents: "all",
  });
  document.body.appendChild(interactionBlocker);
}

function _removeInteractionBlocker() {
  if (interactionBlocker) {
    interactionBlocker.remove();
    interactionBlocker = null;
  }
}

/////////////////////////////////////////////////////////////////////////////
// Dim overlay & layer toggle (waypoint-choice step only)

// Semi-transparent dark overlay at z-index 550 — purely visual.
// pointer-events: none so clicks pass through to the map.
// waypointsPane zIndex is 600 so all markers appear above the dim.
function _addDimOverlay() {
  if (dimOverlay || !mainMap) return;

  dimOverlay = document.createElement("div");
  dimOverlay.id = "tour-v2-dim";

  Object.assign(dimOverlay.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "550",
    background: "rgba(0,0,0,0.58)",
    pointerEvents: "none",
  });

  mainMap.getContainer().appendChild(dimOverlay);
}

function _removeDimOverlay() {
  if (dimOverlay) {
    dimOverlay.remove();
    dimOverlay = null;
  }
}

// Enable or disable the checkbox for a named overlay in the main layer control.
// Used to disable the Waypoints checkbox during the waypoint-choice step so
// the user cannot turn off the required layer.
function setLayerToggleEnabled(layerLabel, enabled = true) {
  const labels = document.querySelectorAll(
    ".leaflet-control-layers-overlays label",
  );

  for (const label of labels) {
    if (label.textContent.trim().includes(layerLabel)) {
      const input = label.querySelector("input[type='checkbox']");
      if (input) input.disabled = !enabled;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////
// Layer control helpers
// element.click() bypasses pointer-events / z-index hit-testing, so these
// work correctly while the interaction blocker is active.

function _openLayersControl() {
  const toggle = document.querySelector(".leaflet-control-layers-toggle");
  const control = document.querySelector(".leaflet-control-layers");
  if (
    toggle &&
    control &&
    !control.classList.contains("leaflet-control-layers-expanded")
  ) {
    toggle.click();
  }
}

function _closeLayersControl() {
  const toggle = document.querySelector(".leaflet-control-layers-toggle");
  const control = document.querySelector(".leaflet-control-layers");
  if (
    toggle &&
    control &&
    control.classList.contains("leaflet-control-layers-expanded")
  ) {
    toggle.click();
  }
}

// Click a basemap radio button in the main layer control (first .leaflet-control-layers).
function _switchBasemap(name) {
  const mainControl = document.querySelector(".leaflet-control-layers");
  if (!mainControl) return;
  for (const label of mainControl.querySelectorAll(
    ".leaflet-control-layers-base label",
  )) {
    if (label.textContent.trim() === name) {
      const input = label.querySelector("input[type=radio]");
      if (input && !input.checked) input.click();
      return;
    }
  }
}

// Toggle a named overlay checkbox in the main layer control.
// Fires Leaflet overlayadd/overlayremove events → handleOverlayAdd/Remove in app.js.
function _setOverlay(name, show) {
  const mainControl = document.querySelector(".leaflet-control-layers");
  if (!mainControl) return;
  for (const label of mainControl.querySelectorAll(
    ".leaflet-control-layers-overlays label",
  )) {
    if (label.textContent.trim() === name) {
      const input = label.querySelector("input[type=checkbox]");
      if (!input) return;
      if ((show && !input.checked) || (!show && input.checked)) input.click();
      return;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////
// Route sublayer helpers
//
// CRITICAL: _toggleRouteSublayer() NEVER removes routeLayer from the map.
//
// Removing routeLayer directly fires Leaflet's _onLayerChange → overlayremove
// with name "Routes" → handleOverlayRemove in app.js → destroys routeControls.
// Instead, individual sublayers are added/removed while routeLayer stays on the
// map. Their names are HTML icon strings that never match "Routes", so
// handleOverlayRemove is not triggered.
//
// The routeControls checkboxes update automatically (Leaflet listens to each
// sublayer's add/remove events), giving the user accurate visual feedback.

// Access individual route-type layers via routeControls._layers
// (stable Leaflet v1.9.4 internal API).
function _getRouteSublayers() {
  const result = {};
  if (!window.routeControls?._layers) return result;
  routeControls._layers.forEach((l) => {
    const n = l.name || "";
    if (n.includes("fa-plane")) result.plane = l.layer;
    else if (n.includes("fa-train")) result.train = l.layer;
    else if (n.includes("fa-car")) result.auto = l.layer;
    else if (n.includes("fa-ship")) result.boat = l.layer;
    else if (n.includes("fa-hiking")) result.hike = l.layer;
    else if (n.includes("legend-link")) result.legend = l.layer;
  });
  return result;
}

// Toggle individual route sublayers.
// routeLayer is never touched.
function _toggleRouteSublayer(typeName) {
  const subs = _getRouteSublayers();
  const layer = subs[typeName];

  if (!layer) return;

  if (mainMap.hasLayer(layer)) {
    mainMap.removeLayer(layer);
  } else {
    mainMap.addLayer(layer);
  }
}

// Restore all five route type sublayers.
function _restoreAllRoutes() {
  const subs = _getRouteSublayers();
  ["plane", "train", "auto", "boat", "hike"].forEach((type) => {
    if (subs[type] && !mainMap.hasLayer(subs[type])) {
      mainMap.addLayer(subs[type]);
    }
  });
}

// Restore sublayers only if routeLayer is currently on the map.
// Safe to call during cleanup when route state is uncertain.
function _restoreAllRoutesIfActive() {
  if (routeLayer && mainMap.hasLayer(routeLayer)) _restoreAllRoutes();
}

// Toggle the routes legend popup via its "?" checkbox in routeControls.
function _openRouteLegend() {
  const legendLink = document.getElementById("legend-link");
  const legendPopup = document.getElementById("routes-legend-popup");
  const checkbox = legendLink
    ?.closest("label")
    ?.querySelector("input[type=checkbox]");
  if (checkbox && !checkbox.checked) {
    legendPopup.classList.remove("hidden"); // show legend
    checkbox.click();
  }
}

function _closeRouteLegend() {
  const legendLink = document.getElementById("legend-link");
  const legendPopup = document.getElementById("routes-legend-popup");
  const checkbox = legendLink
    ?.closest("label")
    ?.querySelector("input[type=checkbox]");
  if (checkbox && checkbox.checked) {
    legendPopup.classList.add("hidden"); // hide legend
    checkbox.click();
  }
}

/////////////////////////////////////////////////////////////////////////////
// Waypoint popup listener

// Removes the popupopen listener installed for the waypoint-choice step.
// Must be idempotent — safe to call multiple times from different code paths
// (step hide, cancel, complete, restart).
function _cleanupWaypointListener() {
  if (_waypointPopupHandler) {
    mainMap?.off("popupopen", _waypointPopupHandler);
    _waypointPopupHandler = null;
  }
}

/////////////////////////////////////////////////////////////////////////////
// Full cleanup

function _cleanupTourState() {
  _clearTourTimers();
  _removeInteractionBlocker();
  _removeDimOverlay();
  _closeLayersControl();
  _cleanupWaypointListener();
  _restoreAllRoutesIfActive(); // restore routes if cancelled mid-demo
}

/////////////////////////////////////////////////////////////////////////////
// Main tour

function _runTour() {
  if (markers && !mainMap.hasLayer(markers)) mainMap.addLayer(markers);

  const tour = new Shepherd.Tour({
    useModalOverlay: false,
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true },
    },
  });

  window.tour = tour;

  ///////////////////////////////////////////////////////////////////////////
  // STEP 0 — WELCOME / OPT-IN
  // Unattached. Interaction blocker is NOT active yet.
  tour.addStep({
    id: "welcome",
    text: [
      "<strong>Want a quick guided tour?</strong>",
      "<br><br>",
      "I'll show you how Waypoints works in about a minute and a half.",
    ].join(""),
    buttons: [
      {
        text: "I'll explore",
        classes: "shepherd-button-secondary",
        action: () => tour.complete(),
      },
      {
        text: "Show me",
        action: () => {
          _addInteractionBlocker();
          tour.next();
        },
      },
    ],
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 1 — THE WORLD
  // Brief narration over the initial global view.
  // Opens the Layers control just before advancing so it is already expanded
  // when step 2 (basemaps) positions its Shepherd dialog.
  tour.addStep({
    id: "world",
    text: "<strong>Waypoints is a map of places, journeys, and memories.</strong>",
    when: {
      show: () => {
        _setOverlay("Activities", false);
        _setOverlay("Routes", false);
        _switchBasemap("Satellite");
        _tourTimeout(
          "world",
          () => {
            _openLayersControl();
            _nextStep("world");
          },
          4000,
        );
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 2 — BASEMAP DEMONSTRATION
  // Layers control is open. Cycles Satellite → Street Map → Physical → Satellite.
  tour.addStep({
    id: "basemaps",
    attachTo: { element: ".leaflet-control-layers", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "<strong>Different map styles let you see the world in different ways.</strong>",
    when: {
      show: () => {
        _openLayersControl(); // safety: ensure expanded
        _tourTimeout("basemaps", () => _switchBasemap("Street Map"), 1500);
        _tourTimeout("basemaps", () => _switchBasemap("Physical"), 3500);
        _tourTimeout("basemaps", () => _switchBasemap("Satellite"), 5500);
        _tourTimeout("basemaps", () => _nextStep("basemaps"), 7500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 3 — LAYERS NARRATION
  // Control still open. Transition narration before the overlay demonstration.
  tour.addStep({
    id: "layers-intro",
    attachTo: { element: ".leaflet-control-layers", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "The Layers menu also controls <em><strong>what</strong></em> appears on the map.",
    when: {
      show: () => {
        _tourTimeout("layers-intro", () => _nextStep("layers-intro"), 3500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 4 — ACTIVITIES OVERLAY (incremental two-phase reveal)
  //
  // Phase 1: Waypoints-only map with "Places tell one story."
  // Phase 2: Activities layer appears; dialog text adds explanatory sentence.
  //          The second line is introduced because the second layer arrived.
  tour.addStep({
    id: "activities",
    attachTo: {
      element: ".leaflet-control-layers",
      on: "left",
    },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "<strong>Places tell one story.</strong>",
    when: {
      show: () => {
        _tourTimeout(
          "activities",
          () => {
            _setOverlay("Activities", true);

            const step = window.tour?.getById("activities");

            if (step) {
              step.updateStepOptions({
                text:
                  "Places tell one story.<br>" +
                  "<strong>Activities reveal another.</strong>",
              });
            }
          },
          4000,
        );

        _tourTimeout("activities", () => _nextStep("activities"), 9000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 5 — ROUTES OVERLAY
  // Activities off, Routes on. handleOverlayAdd fires naturally, adding the
  // routeControls panel to the map.
  tour.addStep({
    id: "routes",
    attachTo: { element: ".leaflet-control-layers", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "And the journeys between them matter too.",
    when: {
      show: () => {
        _setOverlay("Activities", false);
        _setOverlay("Routes", true);
        _tourTimeout("routes", () => _nextStep("routes"), 4500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 6 — ROUTE TYPES + ROUTE LEGEND
  //
  // Cycles plane → train → auto, then restores all routes.
  // routeLayer is NEVER removed — only individual sublayers are toggled —
  // so the routeControls panel stays visible and its checkboxes accurately
  // reflect the current map state throughout the demonstration.
  tour.addStep({
    id: "route-types",
    attachTo: { element: ".leaflet-control-layers", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "Routes can be explored by <em><strong>how</strong></em> I traveled.",
    when: {
      show: () => {
        // All routes begin ON.

        // Plane OFF
        _tourTimeout("route-types", () => _toggleRouteSublayer("plane"), 1500);

        // Plane ON
        _tourTimeout("route-types", () => _toggleRouteSublayer("plane"), 3000);

        // Train OFF
        _tourTimeout("route-types", () => _toggleRouteSublayer("train"), 4500);

        // Train ON
        _tourTimeout("route-types", () => _toggleRouteSublayer("train"), 6000);

        // Auto OFF
        _tourTimeout("route-types", () => _toggleRouteSublayer("auto"), 7500);

        // Auto ON
        _tourTimeout("route-types", () => _toggleRouteSublayer("auto"), 9000);

        // Route legend ON
        _tourTimeout("route-types", () => _openRouteLegend(), 10500);

        // Route legend OFF
        _tourTimeout("route-types", () => _closeRouteLegend(), 12000);

        _tourTimeout("route-types", () => _nextStep("route-types"), 13500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 7 — MAIN LEGEND EXPLANATION
  // Closes the Layers panel, turns off Routes/Activities, explains legend.
  // Colors match the application's marker color scheme.
  tour.addStep({
    id: "legend",
    attachTo: { element: ".leaflet-bottom.leaflet-right", on: "left" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: [
      "<strong>These markers show the places in the story.</strong>",
      "<br><br>",
      '<span style="color:#FF5733"><i class="fas fa-home"></i></span>&nbsp;Residence — places I lived<br>',
      '<span style="color:#FFB400"><i class="fas fa-graduation-cap"></i></span>&nbsp;Academic — places connected to school or study<br>',
      '<span style="color:#008A51"><i class="fas fa-globe"></i></span>&nbsp;Other — places that left their mark in other ways',
      "<br><br>",
      "<em>Marker size reflects how deeply each place is woven into my life story.</em>",
    ].join(""),
    when: {
      show: () => {
        // _setOverlay('Routes', false) fires handleOverlayRemove → removes routeControls cleanly
        _setOverlay("Routes", false);
        _setOverlay("Activities", false);
        _closeLayersControl();
        if (markers && !mainMap.hasLayer(markers)) mainMap.addLayer(markers);
        _tourTimeout("legend", () => _nextStep("legend"), 9000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 8 — WAYPOINT CHOICE (the one required user interaction)
  //
  // Visual hierarchy:
  //   dimmed map background  (z-index 550, pointer-events: none)
  //   waypoint markers       (waypointsPane 600 — fully visible)
  //   Shepherd dialog        (z-index 9999)
  //
  // The interaction blocker is removed so the user can click any waypoint.
  // The tour advances when the first popupopen fires on the map.
  //
  // The listener reference is stored in _waypointPopupHandler so it can be
  // cleaned up if the step exits before the user clicks (cancel/restart).
  tour.addStep({
    id: "waypoint-choice",
    text: [
      "<strong>Every marker opens a little story.</strong>",
      "<br><br>",
      "Let's visit one.",
      "<br><br>",
      "<em>Click any Waypoint to continue.</em>",
    ].join(""),
    when: {
      show: () => {
        const stepId = "waypoint-choice";

        // Dim the background and raise waypoints above the dim overlay
        _addDimOverlay();

        // Remove the blocker — the user must click a marker
        _removeInteractionBlocker();

        // Waypoints must remain available for the required interaction.
        setLayerToggleEnabled("Waypoints", false);

        // Advance on the first waypoint popup
        const onAnyPopup = () => {
          _waypointPopupHandler = null;
          mainMap.off("popupopen", onAnyPopup);
          if (tourCancelled) return;

          _removeDimOverlay();
          setLayerToggleEnabled("Waypoints", true);

          _addInteractionBlocker(); // re-block for remaining automated steps
          _nextStep(stepId);
        };

        _waypointPopupHandler = onAnyPopup;
        mainMap.on("popupopen", _waypointPopupHandler);
      },
      hide: () => {
        // Clean up if the step exits before the user clicks
        _cleanupWaypointListener();
        _removeDimOverlay();
        setLayerToggleEnabled("Waypoints", true);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 9 — POPUP / PHOTO STORY
  // Popup is open. Carousel runs without interference.
  // Enough time for at least one automatic photo transition.
  tour.addStep({
    id: "popup",
    attachTo: { element: ".leaflet-popup", on: "bottom" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 30] } }],
    },
    text: "Every waypoint has its own story—photos, memories, and a glimpse of the place itself.",
    when: {
      show: () => {
        _tourTimeout("popup", () => _nextStep("popup"), 9000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 10 — ZOOM
  // Dialog attaches to the Zoom button in the open popup. Auto-clicks it.
  // zoomToArea() closes the popup and animates the map.
  tour.addStep({
    id: "zoom",
    attachTo: { element: ".zoom-button", on: "top" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 24] } }],
    },
    text: "<strong>Want a closer look?</strong><br><br>Zoom brings you closer to the place.",
    when: {
      show: () => {
        _tourTimeout(
          "zoom",
          () => {
            document.querySelector(".leaflet-popup .zoom-button")?.click();
          },
          2000,
        );
        _tourTimeout("zoom", () => _nextStep("zoom"), 5000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 11 — RESET
  // Dialog attaches to the Reset button. Auto-clicks it.
  tour.addStep({
    id: "reset",
    attachTo: { element: ".reset-map-button", on: "right" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: "And <strong>Reset</strong> brings you back to the big picture.",
    when: {
      show: () => {
        _tourTimeout(
          "reset",
          () => {
            document.querySelector(".reset-map-button")?.click();
          },
          1500,
        );
        _tourTimeout("reset", () => _nextStep("reset"), 4000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 12 — ABOUT BUTTON
  // Dialog attaches to the About button. Modal is NOT opened.
  tour.addStep({
    id: "about",
    attachTo: { element: ".about-button", on: "right" },
    popperOptions: {
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    },
    text: [
      "<strong>Want the story behind the map?</strong>",
      "<br><br>",
      "About explains where Waypoints came from—and how it was built.",
      "<br><br>",
      "You can also restart the tour from there.",
    ].join(""),
    when: {
      show: () => {
        _tourTimeout("about", () => _nextStep("about"), 5500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 13 — FINAL CALL TO ACTION
  // Interaction blocker removed. Tour completes after reading time.
  // tour.on('complete') resets the map to a clean canonical state.
  tour.addStep({
    id: "final",
    text: [
      "<strong>That's Waypoints.</strong>",
      "<br><br>",
      "<strong>Now it's your turn.</strong>",
      "<br><br>",
      "<em>Follow a route. Open a place. Browse the photos. Wander.</em>",
    ].join(""),
    when: {
      show: () => {
        _removeInteractionBlocker();
        _tourTimeout(
          "final",
          () => {
            if (window.tour) window.tour.complete();
          },
          5000,
        );
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // Cancel / complete handlers
  // Both paths clean up tour artifacts and restore the map to initial state.

  // Fires when the user clicks X, or when restartTour() calls tour.cancel().
  tour.on("cancel", () => {
    tourCancelled = true;
    _cleanupTourState();
    resetMapForTour();
    window.tour = null;
  });

  // Fires on normal tour completion (including "I'll explore").
  tour.on("complete", () => {
    _cleanupTourState();
    resetMapForTour();
    window.tour = null;
  });

  tour.start();
}
