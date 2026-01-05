// Description: Carousel for images/videos in Leaflet popups with autoplay,
// fullscreen support, and pinch/zoom (images only) via Panzoom.

// Table of Contents:

// photo carousel
// fullscreen button event listener
// reset panzoom on popup open
// reset panzoom on fullscreen toggle

// carousel for multiple photos, with controls
function displayMultiplePhotos(photoSet, carouselId) {
  // get carousel elements
  const carousel = document.querySelector(`#${carouselId} .carousel-photos`);
  const prevBtn = document.querySelector(`#${carouselId} #prev-button`);
  const nextBtn = document.querySelector(`#${carouselId} #next-button`);
  const playPauseBtn = document.querySelector(
    `#${carouselId} #play-pause-button`
  );

  // clear previous photo
  carousel.innerHTML = "";

  // declare variables
  let index = 0;
  let intervalId = null;
  let isPlaying = true;

  // create photo or video element and set attributes
  const createMediaElement = (src, i) => {
    // create video or image element based on file type
    const isVideo = src.endsWith(".mp4");
    const el = document.createElement(isVideo ? "video" : "img");

    // set attributes for media element
    el.src = src;
    el.classList.add(isVideo ? "carousel-video" : "carousel-photo");
    if (i !== 0) el.classList.add("hidden");

    // conditional attributes for images vs videos
    if (!isVideo) {
      // lazy loading for images
      // lazy loading only works for images, not videos
      el.loading = "lazy";
      // stop Leaflet/map touch interference
      ["touchstart", "touchmove", "touchend"].forEach((evt) => {
        el.addEventListener(evt, (e) => e.stopPropagation(), {
          passive: false,
        });
      });
      // add controls, autoplay, mute to videos
    } else {
      el.controls = true;
      el.autoplay = true;
      el.muted = true;
    }

    // add photo or video to carousel
    carousel.appendChild(el);
    return el;
  };

  // add photos and videos to carousel
  const mediaElements = photoSet.map(createMediaElement);

  // initialize panzoom on the first image
  const first = mediaElements[0];
  if (first.tagName === "IMG") {
    first.panzoom?.destroy?.(); // destroy just in case
    first.panzoom = Panzoom(first, {
      maxScale: 4,
      minScale: 1,
      contain: "outside",
    });
    // enable zooming with mouse wheel
    first.parentElement.addEventListener("wheel", first.panzoom.zoomWithWheel, {
      passive: false,
    });
  }

  // slideshow/hide logic
  const showMedia = (newIndex) => {
    // declare currently shown and next media elements
    const current = mediaElements[index];
    const next = mediaElements[newIndex];

    // turn off current photo or video (and pause if video)
    current.classList.add("hidden");
    if (current.tagName === "VIDEO") current.pause();

    // destroy panzoom on current image
    if (current.tagName === "IMG" && current.panzoom) {
      current.panzoom.destroy();
      delete current.panzoom;
    }

    // turn on next photo or video
    index = newIndex;
    next.classList.remove("hidden");

    // create panzoom on next image after layout stabilizes
    if (next.tagName === "IMG") {
      requestAnimationFrame(() => {
        const panzoom = Panzoom(next, {
          maxScale: 4,
          minScale: 1,
          contain: "outside",
        });
        next.panzoom = panzoom;
        // enable zooming with mouse wheel
        next.parentElement.addEventListener("wheel", panzoom.zoomWithWheel, {
          passive: false,
        });
      });
    }

    // clear any previous interval
    clearInterval(intervalId);

    // if video, autoplay, restart interval on video end
    if (next.tagName === "VIDEO") {
      next.play();
      next.onended = () => isPlaying && startCarousel();
    } else if (isPlaying) {
      // if image, restart interval
      startCarousel();
    }
  };

  // increment index, show next photo or video
  const showNext = () => showMedia((index + 1) % photoSet.length);

  // decrement index, show previous photo or video
  const showPrev = () =>
    showMedia((index - 1 + photoSet.length) % photoSet.length);

  // update play/pause button icon based on playing state
  const updatePlayPauseBtn = (playing) => {
    playPauseBtn.innerHTML = `
      <i class="fas fa-circle fa-stack-2x"></i>
      <i class="fas fa-${
        playing ? "pause" : "play"
      } fa-stack-1x fa-inverse"></i>
    `;
  };

  // play carousel, set interval, change button to pause
  const startCarousel = () => {
    intervalId = setInterval(showNext, 5000);
    updatePlayPauseBtn(true);
  };

  // pause carousel, clear interval, change button to play
  const stopCarousel = () => {
    clearInterval(intervalId);
    updatePlayPauseBtn(false);
  };

  // toggle play/pause state
  const togglePlayPause = (event) => {
    // prevent event from propagating to parent elements
    // (or else hitting pause closes the popup)
    event.stopPropagation();
    isPlaying ? stopCarousel() : startCarousel();
    isPlaying = !isPlaying;
  };

  // add event listeners to buttons
  prevBtn.addEventListener("click", () => {
    stopCarousel();
    showPrev();
  });

  nextBtn.addEventListener("click", () => {
    stopCarousel();
    showNext();
  });

  playPauseBtn.addEventListener("click", togglePlayPause);

  // initial play
  startCarousel();
}

//////////////////////////////////////////////////////////

// event listener for photo reel fullscreen button
document.addEventListener("click", (event) => {
  const fullscreenButton = document.querySelector("#fullscreen-button");
  const carouselContainer = document.querySelector(".carousel-container"); // entire carousel container

  // if not fullscreen button, exit early (safeguard)
  if (!event.target.closest("#fullscreen-button")) return;

  // if in fullscreen, exit fullscreen, change button to enter fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    document.webkitExitFullscreen?.(); // Safari
    document.msExitFullscreen?.(); // IE/Edge

    carouselContainer.classList.remove("fullscreen");
    fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-expand fa-stack-1x fa-inverse"></i>
      `;
    // if not, enter fullscreen, change button to exit fullscreen
  } else {
    carouselContainer.requestFullscreen?.();
    carouselContainer.webkitRequestFullscreen?.(); // Safari
    carouselContainer.msRequestFullscreen?.(); // IE/Edge

    carouselContainer.classList.add("fullscreen");
    fullscreenButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-compress fa-stack-1x fa-inverse"></i>
      `;
  }
});

//////////////////////////////////////////////////////////

// reset and re-initialize panzoom on popup open
function bindCarouselPanzoomResets(mainMap) {
  // wait until mainMap exists (safety check)
  if (!mainMap) return;

  // on popup open event
  mainMap.on("popupopen", (e) => {
    // get all images in popup
    const imgs = e.popup.getElement()?.querySelectorAll(".carousel-photo");

    // if no images, exit
    // not all popups have images
    if (!imgs) return;

    // destroy previous panzoom if any
    imgs.forEach((img) => {
      if (img.panzoom) {
        img.panzoom.destroy();
        delete img.panzoom;
      }

      // recreate panzoom after layout stabilizes
      requestAnimationFrame(() => {
        const panzoom = Panzoom(img, {
          maxScale: 4,
          minScale: 1,
          contain: "outside",
        });
        img.panzoom = panzoom;
        // enable zooming with mouse wheel
        img.parentElement.addEventListener("wheel", panzoom.zoomWithWheel, {
          passive: false,
        });
      });
    });
  });
}

//////////////////////////////////////////////////////////

// reset panzoom on fullscreen toggle
document.addEventListener("fullscreenchange", () => {
  // for each image with panzoom
  document.querySelectorAll(".carousel-photo").forEach((img) => {
    // if no panzoom, exit
    if (!img.panzoom) return;

    // destroy panzoom and...
    img.panzoom.destroy();
    delete img.panzoom;

    // ...recreate panzoom to reset properly (after layout stabilizes)
    requestAnimationFrame(() => {
      const panzoom = Panzoom(img, {
        maxScale: 4,
        minScale: 1,
        contain: "outside",
      });
      img.panzoom = panzoom;
      img.parentElement.addEventListener("wheel", panzoom.zoomWithWheel, {
        passive: false,
      });
    });
  });
});
