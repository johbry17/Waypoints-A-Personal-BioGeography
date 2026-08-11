// tourVersion2.js — Guided Journey for Waypoints
//
// Drop-in replacement for tour.js. Exports startMapTour() and restartTour()
// for use by app.js (welcome modal) and index.html (About modal restart button).
//
// Architecture:
//   • Single Shepherd tour, useModalOverlay: false throughout
//   • Transparent interaction blocker div during all automated steps
//     (prevents accidental user interaction without dimming the map)
//   • Dark visual dim overlay during the Cape Town step only
//     (pointer-events: none — purely visual, clicks still pass through)
//   • Cape Town is the only required user interaction
//   • All advancement uses step-scoped timers so stale callbacks never
//     fire tour.next() on the wrong step
//
// Table of Contents:
//   tour state
//   public entry points  — startMapTour(), restartTour()
//   map reset            — resetMapForTour()
//   timer helpers        — _tourTimeout(), _nextStep(), _clearTourTimers()
//   interaction blocking — _addInteractionBlocker(), _removeInteractionBlocker()
//   dim overlay          — _addDimOverlay(), _removeDimOverlay()
//   layer control        — _openLayersControl(), _closeLayersControl()
//   basemap / overlay    — _switchBasemap(), _setOverlay()
//   route sublayers      — _getRouteSublayers(), _showOnlyRouteSublayer(),
//                           _restoreAllRoutes(), _openRouteLegend(), _closeRouteLegend()
//   marker highlight     — _highlightCapeTown(), _removeMarkerHighlight()
//   Cape Town helpers    — _getCapeTownData(), _panToCapeTown(), _openCapeTownPopup()
//   cleanup              — _cleanupTourState()
//   main tour            — _runTour()

/////////////////////////////////////////////////////////////////////////////
// Tour state

let tourCancelled = false;
let tourTimers = [];         // all pending setTimeout IDs
let interactionBlocker = null; // invisible click-blocking div
let dimOverlay = null;       // dark visual overlay for Cape Town step

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
    window.tour.complete(); // triggers cleanup via tour.on('complete')
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

// Brings the map back to the initial Waypoints state:
// Satellite basemap, Waypoints visible, initial bounds, no popup.
function resetMapForTour() {
  if (!mainMap) return;

  mainMap.closePopup();

  // Reset to initial bounds via the existing reset button
  document.querySelector('.reset-map-button')?.click();

  // Switch to Satellite basemap via the layer control
  _switchBasemap('Satellite');

  // Ensure Activities and Routes are off
  _setOverlay('Activities', false);
  _setOverlay('Routes', false);

  // Ensure Waypoints layer is on the map
  if (markers && !mainMap.hasLayer(markers)) mainMap.addLayer(markers);
}

/////////////////////////////////////////////////////////////////////////////
// Timer helpers

// Step-scoped setTimeout: the callback only fires if the tour is still
// on stepId. Prevents stale timers from advancing the wrong step.
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

// Cancel all pending timers (called on cancel/complete).
function _clearTourTimers() {
  tourTimers.forEach(id => clearTimeout(id));
  tourTimers = [];
}

/////////////////////////////////////////////////////////////////////////////
// Interaction blocking

// An invisible full-screen div that catches all mouse events during the
// automated portion, preventing accidental map clicks without dimming.
// Shepherd dialogs (z-index 9999) and the cancel X remain accessible above it.
function _addInteractionBlocker() {
  if (interactionBlocker) return;
  interactionBlocker = document.createElement('div');
  interactionBlocker.id = 'tour-v2-blocker';
  Object.assign(interactionBlocker.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '8000',
    cursor: 'default',
    pointerEvents: 'all',
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
// Dim overlay (Cape Town step only)

// Semi-transparent dark overlay — purely visual, pointer-events: none so
// clicks still reach the map and markers below it.
function _addDimOverlay() {
  if (dimOverlay) return;
  dimOverlay = document.createElement('div');
  dimOverlay.id = 'tour-v2-dim';
  Object.assign(dimOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '3000',
    background: 'rgba(0,0,0,0.58)',
    pointerEvents: 'none',
    transition: 'opacity 0.25s ease',
  });
  document.body.appendChild(dimOverlay);
}

function _removeDimOverlay() {
  if (dimOverlay) {
    dimOverlay.remove();
    dimOverlay = null;
  }
}

/////////////////////////////////////////////////////////////////////////////
// Layer control helpers
// All element clicks use element.click() which bypasses z-index/pointer-events
// hit-testing, so they work even while the interaction blocker is active.

function _openLayersControl() {
  const control = document.querySelector('.leaflet-control-layers');
  if (control && !control.classList.contains('leaflet-control-layers-expanded')) {
    // Directly add the expanded class (avoids hover-event dependency)
    control.classList.add('leaflet-control-layers-expanded');
  }
}

function _closeLayersControl() {
  const control = document.querySelector('.leaflet-control-layers');
  if (control && control.classList.contains('leaflet-control-layers-expanded')) {
    control.classList.remove('leaflet-control-layers-expanded');
  }
}

// Switch the active basemap by clicking its radio button in the layer control.
function _switchBasemap(name) {
  const mainControl = document.querySelector('.leaflet-control-layers');
  if (!mainControl) return;
  const labels = mainControl.querySelectorAll('.leaflet-control-layers-base label');
  for (const label of labels) {
    if (label.textContent.trim() === name) {
      const input = label.querySelector('input[type=radio]');
      if (input && !input.checked) input.click();
      return;
    }
  }
}

// Toggle a named overlay checkbox. Only clicks if the current state differs
// from the requested state. Fires Leaflet's overlayadd/overlayremove events,
// which drive handleOverlayAdd/handleOverlayRemove in app.js.
function _setOverlay(name, show) {
  const mainControl = document.querySelector('.leaflet-control-layers');
  if (!mainControl) return;
  const labels = mainControl.querySelectorAll('.leaflet-control-layers-overlays label');
  for (const label of labels) {
    if (label.textContent.trim() === name) {
      const input = label.querySelector('input[type=checkbox]');
      if (!input) return;
      if ((show && !input.checked) || (!show && input.checked)) input.click();
      return;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////
// Route sublayer helpers

// Access the individual route-type layers via the routeControls internal
// _layers registry (Leaflet L.control.layers internal API, stable in v1.9.4).
function _getRouteSublayers() {
  const result = {};
  if (!window.routeControls?._layers) return result;
  routeControls._layers.forEach(l => {
    const n = l.name || '';
    if (n.includes('fa-plane'))       result.plane  = l.layer;
    else if (n.includes('fa-train'))  result.train  = l.layer;
    else if (n.includes('fa-car'))    result.auto   = l.layer;
    else if (n.includes('fa-ship'))   result.boat   = l.layer;
    else if (n.includes('fa-hiking')) result.hike   = l.layer;
    else if (n.includes('legend-link')) result.legend = l.layer;
  });
  return result;
}

// Remove the combined routeLayer and all individual sublayers, then add
// only the requested type. Leaves the routeControls panel visible.
function _showOnlyRouteSublayer(typeName) {
  const subs = _getRouteSublayers();

  // Remove the parent route group if present
  if (routeLayer && mainMap.hasLayer(routeLayer)) mainMap.removeLayer(routeLayer);

  // Remove any individually-added sublayers
  Object.entries(subs).forEach(([key, layer]) => {
    if (key !== 'legend' && layer && mainMap.hasLayer(layer)) {
      mainMap.removeLayer(layer);
    }
  });

  // Add only the requested type
  if (typeName && subs[typeName]) mainMap.addLayer(subs[typeName]);
}

// Remove individually-added sublayers and restore the combined routeLayer.
function _restoreAllRoutes() {
  const subs = _getRouteSublayers();
  Object.entries(subs).forEach(([key, layer]) => {
    if (key !== 'legend' && layer && mainMap.hasLayer(layer)) {
      mainMap.removeLayer(layer);
    }
  });
  if (routeLayer && !mainMap.hasLayer(routeLayer)) mainMap.addLayer(routeLayer);
}

// Toggle the routes legend popup via its checkbox (the "?" in routeControls).
function _openRouteLegend() {
  const legendLink = document.getElementById('legend-link');
  const checkbox = legendLink?.closest('label')?.querySelector('input[type=checkbox]');
  if (checkbox && !checkbox.checked) checkbox.click();
}

function _closeRouteLegend() {
  const legendLink = document.getElementById('legend-link');
  const checkbox = legendLink?.closest('label')?.querySelector('input[type=checkbox]');
  if (checkbox && checkbox.checked) checkbox.click();
}

/////////////////////////////////////////////////////////////////////////////
// Marker highlight helpers

// Applies a visual highlight to the canonical Cape Town CircleMarker by
// adding the .tour-marker class and inline SVG styles (glow effect).
function _highlightCapeTown() {
  // Remove any existing highlights first
  _removeMarkerHighlight();

  const ctData = _getCapeTownData();
  if (!ctData) return;

  let marker = ctData.marker;
  if (marker instanceof L.FeatureGroup) {
    marker = marker.getLayers().find(m => m instanceof L.CircleMarker);
  }

  if (marker?._path) {
    marker._path.classList.add('tour-marker');
    Object.assign(marker._path.style, {
      stroke: '#FFD700',
      strokeWidth: '5',
      filter: 'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 4px #FFD700)',
    });
  }
}

function _removeMarkerHighlight() {
  document.querySelectorAll('.tour-marker').forEach(el => {
    el.classList.remove('tour-marker');
    el.style.stroke = '';
    el.style.strokeWidth = '';
    el.style.filter = '';
  });
}

/////////////////////////////////////////////////////////////////////////////
// Cape Town helpers

function _getCapeTownData() {
  return Object.values(placeData).find(p =>
    p.name?.toLowerCase().includes('cape town') && p._isCanonical
  ) || null;
}

function _panToCapeTown() {
  const ct = _getCapeTownData();
  if (ct?.lat != null && ct?.lng != null) {
    mainMap.setView([ct.lat, ct.lng], 6, { animate: true, duration: 0.8 });
  }
}

function _openCapeTownPopup() {
  const ct = _getCapeTownData();
  if (ct?.marker) ct.marker.openPopup();
}

/////////////////////////////////////////////////////////////////////////////
// Full cleanup on cancel / complete

function _cleanupTourState() {
  _clearTourTimers();
  _removeInteractionBlocker();
  _removeDimOverlay();
  _removeMarkerHighlight();
  _closeLayersControl();

  // Restore waypointsPane z-index if it was raised for the Cape Town step
  const waypointsPane = mainMap?.getPane?.('waypointsPane');
  if (waypointsPane) waypointsPane.style.zIndex = '600';
}

/////////////////////////////////////////////////////////////////////////////
// Main tour

function _runTour() {
  // Ensure markers are on the map before the tour starts
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
  // Unattached step. The user chooses to start or skip.
  // The interaction blocker is NOT active yet.
  tour.addStep({
    id: 'welcome',
    text: [
      '<strong>Want a quick guided tour?</strong>',
      '<br><br>',
      "I'll show you how Waypoints works in about a minute.",
    ].join(''),
    buttons: [
      {
        text: "I'll explore",
        classes: 'shepherd-button-secondary',
        action: () => tour.complete(),
      },
      {
        text: 'Show me',
        action: () => {
          // Activate the interaction blocker before the automated journey begins
          _addInteractionBlocker();
          tour.next();
        },
      },
    ],
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 1 — THE WORLD
  // Brief narration over the initial global view.
  tour.addStep({
    id: 'world',
    text: '<strong>Waypoints is a map of places, journeys, and memories.</strong>',
    when: {
      show: () => {
        // Ensure clean initial state (satellite + waypoints only)
        _setOverlay('Activities', false);
        _setOverlay('Routes', false);
        _switchBasemap('Satellite');
        _tourTimeout('world', () => _nextStep('world'), 2200);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 2 — BASEMAP DEMONSTRATION
  // Open the real Leaflet Layers control and cycle through three basemaps
  // so the relationship between the control and map appearance is clear.
  tour.addStep({
    id: 'basemaps',
    attachTo: { element: '.leaflet-control-layers', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: '<strong>Different map styles let you see the world in different ways.</strong>',
    when: {
      show: () => {
        _openLayersControl();
        _tourTimeout('basemaps', () => _switchBasemap('Street Map'),  700);
        _tourTimeout('basemaps', () => _switchBasemap('Physical'),   1900);
        _tourTimeout('basemaps', () => _switchBasemap('Satellite'),  3100);
        _tourTimeout('basemaps', () => _nextStep('basemaps'),        4200);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 3 — LAYERS NARRATION
  // Layers control stays open. Transition narration before overlay demo.
  tour.addStep({
    id: 'layers-intro',
    attachTo: { element: '.leaflet-control-layers', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: 'The Layers menu also controls <em>what</em> appears on the map.',
    when: {
      show: () => {
        _tourTimeout('layers-intro', () => _nextStep('layers-intro'), 2000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 4 — ACTIVITIES OVERLAY
  // Waypoints stays on. Activities layer is added so both coexist.
  tour.addStep({
    id: 'activities',
    attachTo: { element: '.leaflet-control-layers', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: '<strong>Places tell one story.</strong><br>Activities reveal another.',
    when: {
      show: () => {
        _setOverlay('Activities', true);
        _tourTimeout('activities', () => _nextStep('activities'), 2500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 5 — ROUTES OVERLAY
  // Activities off, Routes on. The routeControls panel appears naturally.
  tour.addStep({
    id: 'routes',
    attachTo: { element: '.leaflet-control-layers', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: 'And the journeys between them matter too.',
    when: {
      show: () => {
        _setOverlay('Activities', false);
        _setOverlay('Routes', true);
        _tourTimeout('routes', () => _nextStep('routes'), 2500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 6 — ROUTE TYPES + ROUTE LEGEND
  // Briefly show planes, trains, autos. Then open and close the route legend.
  // The routeControls panel remains visible throughout.
  tour.addStep({
    id: 'route-types',
    attachTo: { element: '.leaflet-control-layers', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: 'Routes can be explored by <em>how</em> I traveled.',
    when: {
      show: () => {
        // Cycle: planes → trains → autos → all routes restored
        _tourTimeout('route-types', () => _showOnlyRouteSublayer('plane'),  600);
        _tourTimeout('route-types', () => _showOnlyRouteSublayer('train'), 1800);
        _tourTimeout('route-types', () => _showOnlyRouteSublayer('auto'),  3000);
        _tourTimeout('route-types', () => _restoreAllRoutes(),             4200);
        // Open the routes legend briefly, then close it
        _tourTimeout('route-types', () => _openRouteLegend(),              5000);
        _tourTimeout('route-types', () => _closeRouteLegend(),             6800);
        _tourTimeout('route-types', () => _nextStep('route-types'),        7400);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 7 — MAIN LEGEND EXPLANATION
  // Close the layers control. Turn off routes. Explain the legend symbols.
  // Attached to the bottom-right area where the legend lives on the map.
  tour.addStep({
    id: 'legend',
    attachTo: { element: '.leaflet-bottom.leaflet-right', on: 'left' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: [
      '<strong>These markers show the places in the story.</strong>',
      '<br><br>',
      '<i class="fas fa-home"></i>&nbsp;<strong>Residence</strong> — places I lived<br>',
      '<i class="fas fa-graduation-cap"></i>&nbsp;<strong>Academic</strong> — places connected to school or study<br>',
      '<i class="fas fa-globe"></i>&nbsp;<strong>Other</strong> — places that left their mark in other ways',
      '<br><br>',
      '<em>Marker size reflects how deeply each place is woven into the story.</em>',
    ].join(''),
    when: {
      show: () => {
        // Clean up route and overlay state, close the layers panel
        _setOverlay('Routes', false);
        _setOverlay('Activities', false);
        _closeLayersControl();
        // Waypoints should already be on; ensure it
        if (markers && !mainMap.hasLayer(markers)) mainMap.addLayer(markers);
        _tourTimeout('legend', () => _nextStep('legend'), 4500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 8 — CAPE TOWN (the one required user interaction)
  //
  // Sequence:
  //   1. Pan to Cape Town (starts while previous step still hides)
  //   2. Highlight the marker, apply dim overlay, raise waypointsPane
  //   3. Remove the interaction blocker so user can click
  //   4. Listen specifically for the Cape Town marker's popupopen event
  //   5. When popup opens: remove dim overlay, restore z-index, re-block,
  //      advance tour
  //
  // The dim overlay is pointer-events: none (purely visual), so the user
  // can click any marker — but the tour only advances on Cape Town's popup.
  // waypointsPane is raised above the dim overlay so markers remain visible.
  tour.addStep({
    id: 'cape-town',
    // Unattached (centered) — the marker highlight + dim overlay are the
    // visual cue; no need to anchor the dialog to the SVG element.
    text: [
      '<strong>Every marker opens a little story.</strong>',
      '<br><br>',
      "Let's visit one.",
      '<br><br>',
      '<em>Click the glowing marker to open it.</em>',
    ].join(''),
    when: {
      show: () => {
        const stepId = 'cape-town';

        // Pan to Cape Town, then after the animation apply the spotlight effect.
        // Both timers are registered in tourTimers so they can be cancelled.
        _tourTimeout(stepId, () => _panToCapeTown(), 300);

        _tourTimeout(stepId, () => {
          _highlightCapeTown();
          _addDimOverlay();

          // Raise waypointsPane above the dim overlay so markers are visible
          const waypointsPane = mainMap.getPane('waypointsPane');
          if (waypointsPane) waypointsPane.style.zIndex = '4000';

          // Remove the interaction blocker — user must click the marker
          _removeInteractionBlocker();

          // Listen specifically for the Cape Town popup; other markers ignored
          const ctData = _getCapeTownData();
          const popupTarget = ctData?.marker || null;

          const onCapeTownPopup = () => {
            if (tourCancelled) return;
            _removeDimOverlay();
            _removeMarkerHighlight();

            const wp = mainMap.getPane('waypointsPane');
            if (wp) wp.style.zIndex = '600';

            // Re-block interaction for remaining automated steps
            _addInteractionBlocker();

            _nextStep(stepId);
          };

          if (popupTarget) {
            popupTarget.once('popupopen', onCapeTownPopup);
          } else {
            // Fallback: advance on any popup if Cape Town marker not found
            const fallbackHandler = () => {
              mainMap.off('popupopen', fallbackHandler);
              onCapeTownPopup();
            };
            mainMap.on('popupopen', fallbackHandler);
          }
        }, 1300); // 300ms (pan start) + ~1000ms (pan animation)
      },
      hide: () => {
        // If step is dismissed (e.g. cancel) before the popup opens, clean up
        _removeDimOverlay();
        _removeMarkerHighlight();
        const waypointsPane = mainMap.getPane('waypointsPane');
        if (waypointsPane) waypointsPane.style.zIndex = '600';
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 9 — POPUP / PHOTO STORY
  // The Cape Town popup is now open. Let the carousel run naturally.
  // Allow time for at least one automatic photo transition, then advance.
  tour.addStep({
    id: 'popup',
    attachTo: { element: '.leaflet-popup', on: 'bottom' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 30] } }],
    },
    text: 'Every waypoint has its own story—photos, memories, and a glimpse of the place itself.',
    when: {
      show: () => {
        _tourTimeout('popup', () => _nextStep('popup'), 5000);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 10 — ZOOM
  // Highlight the Zoom button in the still-open popup, then auto-click it.
  // zoomToArea() closes the popup and animates the map; we advance shortly after.
  tour.addStep({
    id: 'zoom',
    attachTo: { element: '.zoom-button', on: 'top' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 24] } }],
    },
    text: '<strong>Want a closer look?</strong><br><br>Zoom brings you closer to the place.',
    when: {
      show: () => {
        // Click the popup's zoom button; it closes the popup and zooms in
        _tourTimeout('zoom', () => {
          document.querySelector('.leaflet-popup .zoom-button')?.click();
        }, 1200);
        _tourTimeout('zoom', () => _nextStep('zoom'), 3200);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 11 — RESET
  // Highlight the Reset button, then auto-click it to return to the global view.
  tour.addStep({
    id: 'reset',
    attachTo: { element: '.reset-map-button', on: 'right' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: 'And <strong>Reset</strong> brings you back to the big picture.',
    when: {
      show: () => {
        _tourTimeout('reset', () => {
          document.querySelector('.reset-map-button')?.click();
        }, 1000);
        _tourTimeout('reset', () => _nextStep('reset'), 2800);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 12 — ABOUT BUTTON
  // Highlight the About button but do not open the modal —
  // it contains substantial text that would interrupt the flow.
  tour.addStep({
    id: 'about',
    attachTo: { element: '.about-button', on: 'right' },
    popperOptions: {
      modifiers: [{ name: 'offset', options: { offset: [0, 16] } }],
    },
    text: [
      '<strong>Want the story behind the map?</strong>',
      '<br><br>',
      'About explains where Waypoints came from—and how it was built.',
      '<br><br>',
      'You can also restart the tour from there.',
    ].join(''),
    when: {
      show: () => {
        _tourTimeout('about', () => _nextStep('about'), 3500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // STEP 13 — FINAL STATE: RETURN TO CAPE TOWN
  // Pan back to Cape Town, open its popup, then complete the tour.
  // The popup remains open after the Shepherd tour ends.
  // Interaction blocker is removed here; the tour is over.
  tour.addStep({
    id: 'final',
    // Unattached — the popup opens in the background while this dialog shows.
    text: [
      '<strong>That\'s Waypoints.</strong>',
      '<br><br>',
      '<strong>Now it\'s your turn.</strong>',
      '<br><br>',
      '<em>Follow a route. Open a place. Browse the photos. Wander.</em>',
    ].join(''),
    when: {
      show: () => {
        // Lift the interaction blocker — the guided journey is over
        _removeInteractionBlocker();

        // Pan to Cape Town, then open its popup
        _tourTimeout('final', () => _panToCapeTown(), 400);
        _tourTimeout('final', () => _openCapeTownPopup(), 1600);

        // Complete the Shepherd tour after the user has read the final message.
        // The popup remains open after complete() because it is a Leaflet popup.
        _tourTimeout('final', () => {
          if (window.tour) window.tour.complete();
        }, 4500);
      },
    },
  });

  ///////////////////////////////////////////////////////////////////////////
  // Cancel / complete handlers

  // cancel fires when the user clicks the X; complete fires on normal end.
  // Both paths must fully clean up tour state.
  tour.on('cancel', () => {
    tourCancelled = true;
    _cleanupTourState();
    window.tour = null;
  });

  tour.on('complete', () => {
    _cleanupTourState();
    window.tour = null;
  });

  tour.start();
}
