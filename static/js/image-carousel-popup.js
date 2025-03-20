// carousel for multiple photos, with controls
function displayMultiplePhotos(photoSet, carouselId) {
  const carouselDiv = document.querySelector(`#${carouselId} .carousel-photos`);
  const prevButton = document.querySelector(`#${carouselId} #prev-button`);
  const playPauseButton = document.querySelector(
    `#${carouselId} #play-pause-button`
  );
  const nextButton = document.querySelector(`#${carouselId} #next-button`);

  // clear previous photos
  carouselDiv.innerHTML = "";

  // for empty photo set
  if (!photoSet || photoSet.length === 0) {
    carouselDiv.innerHTML = "<p>No photos available</p>";
    return;
  }

  // add photos
  photoSet.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("carousel-photo");
    img.style.display = index === 0 ? "block" : "none";
    carouselDiv.appendChild(img);
  });

  // initialize variables
  let index = 0;
  let intervalId;
  const imgElements = carouselDiv.querySelectorAll(".carousel-photo");
  let isPlaying = true;

  // rotate through photos
  function showNextPhoto() {
    imgElements[index].style.display = "none";
    index = (index + 1) % photoSet.length;
    imgElements[index].style.display = "block";
  }
  // function showNextPhoto() {
  //     imgElements[index].classList.remove("active");
  //     index = (index + 1) % photoSet.length;
  //     imgElements[index].classList.add("active");
  //   }

  // go back through photos
  function showPrevPhoto() {
    imgElements[index].style.display = "none";
    index = (index - 1 + photoSet.length) % photoSet.length;
    imgElements[index].style.display = "block";
  }
  // function showPrevPhoto() {
  //     imgElements[index].classList.remove("active");
  //     index = (index - 1 + photoSet.length) % photoSet.length;
  //     imgElements[index].classList.add("active");
  //   }

  // play carousel, set interval, change button to pause
  function startCarousel() {
    intervalId = setInterval(showNextPhoto, 5000);
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

  // initial play
  startCarousel();

  // add event listeners
  prevButton.addEventListener("click", () => {
    stopCarousel(); // stop interval to avoid conflicts
    showPrevPhoto();
    if (isPlaying) startCarousel(); // restart if carousel was playing
  });

  nextButton.addEventListener("click", () => {
    stopCarousel(); // stop interval to avoid conflicts
    showNextPhoto();
    if (isPlaying) startCarousel(); // restart if carousel was playing
  });

  playPauseButton.addEventListener("click", (event) => {
    event.stopPropagation(); // otherwise it closes the popup
    if (isPlaying) {
      stopCarousel();
    } else {
      startCarousel();
    }
    isPlaying = !isPlaying;
  });
}
