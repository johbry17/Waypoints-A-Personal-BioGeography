// Shepherd.js tour setup
function startMapTour() {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: false,
      cancelIcon: { enabled: true },
      //   classes: 'shepherd-theme-arrows',
      modalOverlayOpeningPadding: 5,
      modalOverlayOpeningRadius: 5,
    },
  });

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

  //   tour.addStep({
  //     id: "layers-button",
  //     attachTo: {
  //       element: ".leaflet-control-layers",
  //       on: "left",
  //     },
  //     text: "Click here to open the layers control. Close it to continue.",
  //     advanceOn: { selector: ".leaflet-control-layers", event: "mouseleave" },
  //     buttons: [
  //       { text: "Back", action: tour.back },
  //       { text: "Next", action: tour.next },
  //     ],
  //     when: {
  //       show: () => {
  //         const toggle = document.querySelector(".leaflet-control-layers-toggle");
  //         if (toggle) toggle.click();
  //       },
  //     },
  //   });

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
      {
        text: "Back",
        action: tour.back,
      },
      {
        text: "Next",
        action: tour.next,
      },
    ],
    when: {
      show: () => {
        const toggle = document.querySelector(".leaflet-control-layers-toggle");
        if (toggle) toggle.click();
      },
    },
  });

  //   tour.addStep({
  //     id: "layers-button",
  //     attachTo: {
  //       element: ".leaflet-control-layers-toggle",
  //       on: "left",
  //     },
  //     popperOptions: {
  //       modifiers: [
  //         {
  //           name: "offset",
  //           options: {
  //             offset: [0, 16],
  //           },
  //         },
  //       ],
  //     },
  //     text: "Open the map setting here.",
  //     buttons: [
  //       {
  //         text: "Back",
  //         action: tour.back,
  //       },
  //       {
  //         text: "Next",
  //         action: tour.next,
  //       },
  //     ],
  //   });

  //   tour.addStep({
  //     id: "layers-button",
  //     attachTo: {
  //       element: ".leaflet-control-layers", // attaches to the persistent container
  //       on: "left",
  //     },
  //     popperOptions: {
  //       modifiers: [
  //         {
  //           name: "offset",
  //           options: {
  //             offset: [0, 16],
  //           },
  //         },
  //       ],
  //     },
  //     text: "Use this to toggle which map layers are visible.",
  //     buttons: [
  //       { text: "Back", action: tour.back },
  //       { text: "Next", action: tour.next },
  //     ],
  //     when: {
  //       show: () => {
  //         const toggle = document.querySelector(".leaflet-control-layers-toggle");
  //         if (toggle) toggle.click();
  //       },
  //     },
  //   });

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
      {
        text: "Back",
        action: tour.back,
      },
      {
        text: "Next",
        action: tour.next,
      },
    ],
  });

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
    buttons: [
      {
        text: "Back",
        action: tour.back,
      },
      {
        text: "Next",
        action: tour.next,
      },
    ],
  });

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
    buttons: [
      {
        text: "Back",
        action: tour.back,
      },
      {
        text: "Next",
        action: tour.next,
      },
    ],
  });

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
