function previewImage(event, previewId) {
  const reader = new FileReader();
  reader.onload = function () {
    const output = document.getElementById(previewId);
    output.src = reader.result;
    output.style.display = 'block';
  };
  reader.readAsDataURL(event.target.files[0]);
}

function updateMainImage(src) {
  document.getElementById('mainImage').src = src;
}
