// Description: Carousel for images/videos in Leaflet popups with autoplay,
// fullscreen support, and pinch/zoom (images only) via Panzoom.

// Table of Contents:

// photo carousel
// fullscreen button event listener
// reset panzoom on fullscreen toggle

// carousel for multiple photos, with controls
function displayMultiplePhotos(photoSet, carouselId) {
  // get carousel elements
  const carousel = document.querySelector(`#${carouselId} .carousel-photos`);
  const prevBtn = document.querySelector(`#${carouselId} #prev-button`);
  const nextBtn = document.querySelector(`#${carouselId} #next-button`);
  const playPauseBtn = document.querySelector(
    `#${carouselId} #play-pause-button`,
  );

  // clear previous photo
  carousel.innerHTML = "";

  // declare variables
  let index = 0;
  let timeoutId = null;
  let isPlaying = true;

  /* ---------- panzoom logic ---------- */

  // panzoom - attach / detach to images as they are shown/hidden
  const attachPanzoom = (img) => {
    if (!img || img.panzoom) return; // not an image or already attached
    if (!img.isConnected) return; // in the DOM
    if (img.offsetParent === null) return; // hidden or not laid out

    const panzoom = Panzoom(img, {
      maxScale: 4,
      minScale: 1,
      contain: "outside",
    });
    img.panzoom = panzoom;
    // enable zooming with mouse wheel
    img._wheel = panzoom.zoomWithWheel;
    img.parentElement.addEventListener("wheel", img._wheel, { passive: false });
  };

  const detachPanzoom = (img) => {
    if (!img.panzoom) return;
    img.parentElement.removeEventListener("wheel", img._wheel);
    img.panzoom.destroy();
    delete img.panzoom;
    delete img._wheel;
  };

  /* ---------- setup photo/video media elements ---------- */

  // create photo or video element and set attributes
  const createMedia = (src, i) => {
    // create video or image element based on file type
    const isVideo = src.endsWith(".mp4");
    const el = document.createElement(isVideo ? "video" : "img");

    // set attributes for media element
    el.src = src;
    el.classList.add(isVideo ? "carousel-video" : "carousel-photo");
    if (i !== 0) el.classList.add("hidden");

    // conditional attributes for images vs videos
    if (isVideo) {
      // add controls, autoplay, mute to videos
      el.controls = el.autoplay = el.muted = true;
    } else {
      // stop Leaflet/map touch interference
      ["touchstart", "touchmove", "touchend"].forEach((evt) => {
        el.addEventListener(evt, (e) => e.stopPropagation(), {
          passive: false,
        });
      });
    }

    // add photo or video to carousel
    carousel.appendChild(el);
    return el;
  };

  // add photos and videos to carousel
  const media = photoSet.map(createMedia);

  /* ---------- playback ---------- */

  // preload the next image in the background
  const preloadNextImage = () => {
    const nextIndex = (index + 1) % media.length;
    const next = media[nextIndex];

    if (next?.tagName !== "IMG") return;

    const preload = new Image();
    preload.src = next.src;
  };

  // slideshow/hide logic
  const showMedia = (newIndex) => {
    // declare currently shown and next media elements
    const current = media[index];
    const next = media[newIndex];

    // turn off current video (pause) or image (destroy panzoom)
    current.classList.add("hidden");
    if (current.tagName === "VIDEO") current.pause();
    if (current.tagName === "IMG") detachPanzoom(current);

    // turn on next photo or video, load following photo in background
    index = newIndex;
    next.classList.remove("hidden");
    preloadNextImage();

    // clear any previous timer
    clearTimeout(timeoutId);

    // if video, autoplay, restart timer on video end
    if (next.tagName === "VIDEO") {
      next.play();
      next.onended = () => isPlaying && startCarousel();
    } else if (next && next.tagName === "IMG") {
      // else img, add panzoom (after layout stabilizes) and restart timer
      requestAnimationFrame(() => attachPanzoom(next));
      isPlaying && startCarousel();
    }
  };

  // increment / decrement index, show next / previous photo or video
  const showNext = () => showMedia((index + 1) % photoSet.length);
  const showPrev = () =>
    showMedia((index - 1 + photoSet.length) % photoSet.length);

  /* ---------- controls ---------- */

  // update play/pause button icon based on playing state
  const updatePlayPauseBtn = (playing) => {
    playPauseBtn.innerHTML = `
      <i class="fas fa-circle fa-stack-2x"></i>
      <i class="fas fa-${
        playing ? "pause" : "play"
      } fa-stack-1x fa-inverse"></i>
    `;
  };

  // play carousel, start timer, change button to pause
  const startCarousel = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(showNext, 7000);
    updatePlayPauseBtn(true);
  };

  // pause carousel, clear timer, change button to play
  const stopCarousel = () => {
    clearTimeout(timeoutId);
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

  /* ---------- event listeners ---------- */

  prevBtn.addEventListener("click", () => {
    stopCarousel();
    showPrev();
  });

  nextBtn.addEventListener("click", () => {
    stopCarousel();
    showNext();
  });

  playPauseBtn.addEventListener("click", togglePlayPause);

  /* ---------- initialize ---------- */

  // add panzoom to first image if applicable
  if (media[0].tagName === "IMG") {
    requestAnimationFrame(() => attachPanzoom(media[0]));
  }

  // hide controls if only one photo/video in the set
  if (photoSet.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    playPauseBtn.style.display = "none";
  }

  // preload the next image in the background and start the carousel
  // only when there is more than one photo/video
  // (else a single image visually "jumps" with the timer)
  if (photoSet.length > 1) {
    preloadNextImage();
    startCarousel();
  }
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

// reset panzoom on fullscreen toggle
document.addEventListener("fullscreenchange", () => {
  // get currently visible image
  const img = document.querySelector(".carousel-photo:not(.hidden)");
  if (!img) return;

  // destroy panzoom
  if (img.panzoom) {
    img.parentElement.removeEventListener("wheel", img._wheel);
    img.panzoom.destroy();
    delete img.panzoom;
    delete img._wheel;
  }

  // recreate panzoom to reset properly (after layout stabilizes)
  requestAnimationFrame(() => {
    const panzoom = Panzoom(img, {
      maxScale: 4,
      minScale: 1,
      contain: "outside",
    });
    img.panzoom = panzoom;
    // enable zooming with mouse wheel
    img._wheel = panzoom.zoomWithWheel;
    img.parentElement.addEventListener("wheel", img._wheel, { passive: false });
  });
});
