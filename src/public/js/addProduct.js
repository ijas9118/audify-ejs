document.addEventListener('DOMContentLoaded', () => {
  const imageInputs = document.querySelectorAll('.image-input');

  // State: one independent cropper per image slot
  const cropperState = {};

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

      const reader = new FileReader();
      reader.onload = (event) => {
        previewElement.src = event.target.result;
        previewElement.style.display = 'block';
        cropButton.style.display = 'inline-block';
        cropButton.textContent = 'Crop Image';
        cropButton.disabled = false;

        cropperState[previewId] = new Cropper(previewElement, {
          aspectRatio: 1,
          viewMode: 1,
        });
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

      // Update the preview
      previewElement.src = croppedCanvas.toDataURL('image/jpeg');

      // Convert canvas to Blob and replace the file input with a DataTransfer file
      croppedCanvas.toBlob(
        (blob) => {
          const fileName = input.files[0]?.name || 'cropped.jpg';
          const croppedFile = new File([blob], fileName, {
            type: 'image/jpeg',
          });

          // Replace the file in the input using DataTransfer
          const dt = new DataTransfer();
          dt.items.add(croppedFile);
          input.files = dt.files;

          activeCropper.destroy();
          cropperState[previewId] = null;
          cropButton.style.display = 'none';
          cropButton.textContent = 'Cropped ✓';
        },
        'image/jpeg',
        0.92
      );
    });
  });
});
