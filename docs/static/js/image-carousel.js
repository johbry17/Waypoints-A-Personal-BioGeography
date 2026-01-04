// Description: Carousel for images/videos in Leaflet popups with autoplay and fullscreen support

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
    const element = document.createElement(isVideo ? "video" : "img");

    // set attributes for video or image
    element.src = src;
    element.classList.add(isVideo ? "carousel-video" : "carousel-photo");
    element.style.display = i === 0 ? "block" : "none";

    // lazy loading for images
    // lazy loading only works for images, not videos
    if (!isVideo) element.loading = "lazy";
    // add controls, autoplay, mute to videos
    else {
      element.controls = true;
      element.autoplay = true;
      element.muted = true;
    }

    // add photo or video to carousel
    carousel.appendChild(element);
    return element;
  };

  // add photos and videos to carousel
  const mediaElements = photoSet.map(createMediaElement);

  const showMedia = (newIndex) => {
    // turn off previous photo or video
    const current = mediaElements[index];
    current.style.display = "none";
    if (current.tagName === "VIDEO") current.pause();

    // turn on new photo or video
    index = newIndex;
    const next = mediaElements[index];
    next.style.display = "block";

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
