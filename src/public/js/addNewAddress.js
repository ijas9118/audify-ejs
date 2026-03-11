// Custom name field visibility
document.querySelectorAll('input[name="addressType"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const customContainer = document.getElementById('customNameContainer');
    if (customContainer) {
      customContainer.style.display = radio.value === 'other' ? 'block' : 'none';
    }
  });
});

// Redirect to edit page
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-address-edit').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      // If it's a link, it will just follow the href. 
      // This is here as a fallback if needed.
    });
  });
});

// Sync default checkbox with hidden input
const addressForm = document.getElementById('addressForm');
if (addressForm) {
  addressForm.addEventListener('submit', () => {
    const checkbox = document.getElementById('isDefaultCheck');
    const hiddenInput = document.getElementById('isDefaultHidden');

    if (checkbox && hiddenInput) {
      hiddenInput.value = checkbox.checked ? 'true' : 'false';
    }
  });
}
