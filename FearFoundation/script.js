// Grab elements
const thumbnails = document.querySelectorAll('.gallery img');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeBtn = document.querySelector('.lightbox-close');

// For each thumbnail, add click event to open lightbox
thumbnails.forEach(thumbnail => {
  thumbnail.addEventListener('click', () => {
    // Show lightbox
    lightbox.style.display = 'flex';

    // Set the larger image source to the thumbnail's source
    lightboxImg.src = thumbnail.src;

    // (Optional) Use the alt text as the caption
    lightboxCaption.textContent = thumbnail.alt;
  });
});

// Close button event
closeBtn.addEventListener('click', () => {
  lightbox.style.display = 'none';
});

// Close lightbox when clicking outside the image
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none';
  }
});
