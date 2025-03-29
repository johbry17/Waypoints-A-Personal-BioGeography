// carousel for multiple photos, with controls
function displayMultiplePhotos(photoSet, carouselId) {
  // get carousel elements
  const carouselDiv = document.querySelector(`#${carouselId} .carousel-photos`);
  const prevButton = document.querySelector(`#${carouselId} #prev-button`);
  const playPauseButton = document.querySelector(
    `#${carouselId} #play-pause-button`
  );
  const nextButton = document.querySelector(`#${carouselId} #next-button`);

  // clear previous photo
  carouselDiv.innerHTML = "";

  // for empty photo set
  if (!photoSet || photoSet.length === 0) {
    carouselDiv.innerHTML = "<p>No photos available</p>";
    return;
  }

  // declare variables
  let index = 0;
  let intervalId = null;
  let isPlaying = true;

  // add photos or videos to carousel
  const imgElements = photoSet.map((src, i) => {
    // create video or image element based on file type
    const element = src.endsWith(".mp4")
      ? document.createElement("video")
      : document.createElement("img");

    // set attributes for video or image
    element.src = src;
    element.classList.add(
      src.endsWith(".mp4") ? "carousel-video" : "carousel-photo"
    );
    element.style.display = i === 0 ? "block" : "none";

    // add controls, autoplay, mute to videos
    if (element.tagName === "VIDEO") {
      element.controls = true;
      element.autoplay = true;
      element.muted = true;
    }

    // add photo or video to carousel
    carouselDiv.appendChild(element);
    return element;
  });

  function showMedia(newIndex) {
    // turn off previous photo or video
    imgElements[index].style.display = "none";
    if (imgElements[index].tagName === "VIDEO") imgElements[index].pause();

    // turn on new photo or video
    index = newIndex;
    imgElements[index].style.display = "block";
    clearInterval(intervalId); // clear any previous interval

    // if video, autoplay, restart interval on video end
    if (imgElements[index].tagName === "VIDEO") {
      imgElements[index].play();
      imgElements[index].onended = () => {
        if (isPlaying) startCarousel();
      };
    } else {
      // if image, restart interval
      if (isPlaying) {
        startCarousel();
      }
    }
  }

  // increment index, show next photo or video
  function showNext() {
    const nextIndex = (index + 1) % photoSet.length;
    showMedia(nextIndex);
  }

  // decrement index, show previous photo or video
  function showPrev() {
    const prevIndex = (index - 1 + photoSet.length) % photoSet.length;
    showMedia(prevIndex);
  }

  // play carousel, set interval, change button to pause
  function startCarousel() {
    intervalId = setInterval(showNext, 5000); // 5 seconds
    playPauseButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-pause fa-stack-1x fa-inverse"></i>
      `;
  }

  // pause carousel, clear interval, change button to play
  function stopCarousel() {
    clearInterval(intervalId);
    playPauseButton.innerHTML = `
        <i class="fas fa-circle fa-stack-2x"></i>
        <i class="fas fa-play fa-stack-1x fa-inverse"></i>
      `;
  }

  // toggle play/pause state
  function togglePlayPause(event) {
    // prevent event from propagating to parent elements
    // (or else hitting pause closes the popup)
    event.stopPropagation();

    if (isPlaying) stopCarousel();
    else startCarousel();
    isPlaying = !isPlaying;
  }

  // add event listeners to buttons
  prevButton.addEventListener("click", () => {
    stopCarousel();
    showPrev();
  });

  nextButton.addEventListener("click", () => {
    stopCarousel();
    showNext();
  });

  playPauseButton.addEventListener("click", (event) => togglePlayPause(event));

  // initial play
  startCarousel();
}
