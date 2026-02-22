document.addEventListener('DOMContentLoaded', () => {
  const imageInputs = document.querySelectorAll('.image-input');
  const canCrop = typeof Cropper !== 'undefined';

  // State: one independent cropper per image slot
  const cropperState = {};
  const croppedFiles = {};
  window.__addProductCroppedFiles = croppedFiles;

  imageInputs.forEach((input) => {
    const container =
      input.closest('.admin-product-image-card') || input.closest('.col-md-4');
    const previewId = input.id.replace('Input', 'Preview');
    const previewElement = document.getElementById(previewId);
    const cropButton = container?.querySelector('.crop-button');
    // Hidden input that will carry the cropped blob to the server
    const hiddenInput = container?.querySelector('.cropped-data-input');

    if (!previewElement || !cropButton) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Destroy any old cropper for this slot
      if (cropperState[previewId]) {
        cropperState[previewId].destroy();
        cropperState[previewId] = null;
      }

      // Reset cropped hidden input so old value doesn't linger
      if (hiddenInput) hiddenInput.value = '';
      delete croppedFiles[input.id];

      const reader = new FileReader();
      reader.onload = (event) => {
        if (!canCrop) {
          previewElement.src = event.target.result;
          previewElement.style.display = 'block';
          cropButton.style.display = 'inline-block';
          cropButton.textContent = 'Crop unavailable';
          cropButton.disabled = true;
          return;
        }

        previewElement.onload = () => {
          if (cropperState[previewId]) {
            cropperState[previewId].destroy();
          }

          cropperState[previewId] = new Cropper(previewElement, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            background: false,
          });
        };

        previewElement.src = event.target.result;
        previewElement.style.display = 'block';
        cropButton.style.display = 'inline-block';
        cropButton.textContent = 'Crop Image';
        cropButton.disabled = false;
      };
      reader.readAsDataURL(file);
    });

    // FIX: use 'click' with preventDefault so the button does NOT submit the form
    cropButton.addEventListener('click', (e) => {
      e.preventDefault(); // <-- critical: prevents form submission

      const activeCropper = cropperState[previewId];
      if (!activeCropper) return;

      const croppedCanvas = activeCropper.getCroppedCanvas({
        width: 800,
        height: 800,
      });
      if (!croppedCanvas) return;

      // Update the preview
      previewElement.src = croppedCanvas.toDataURL('image/jpeg');

      // Convert canvas to Blob and keep it for form submission.
      croppedCanvas.toBlob(
        (blob) => {
          if (!blob) return;

          const fileName = input.files[0]?.name || 'cropped.jpg';
          const croppedFile = new File([blob], fileName, {
            type: 'image/jpeg',
          });

          // Keep cropped file in memory and append it to FormData on submit.
          croppedFiles[input.id] = croppedFile;

          activeCropper.destroy();
          cropperState[previewId] = null;
          cropButton.textContent = 'Cropped';
          cropButton.disabled = true;
        },
        'image/jpeg',
        0.92
      );
    });
  });
});
