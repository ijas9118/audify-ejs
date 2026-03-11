document.addEventListener('DOMContentLoaded', () => {
  setupAddressSelection();
  setupCouponApplication();
  setupCheckoutFormSubmit();
});

// ─── Address Card Selection ───────────────────────────────────────────────────

function setupAddressSelection() {
  const addressCards = document.querySelectorAll('.address-card-modern');
  const selectedAddressIdInput = document.getElementById('selectedAddressId');
  const shippingSection = document.getElementById('shippingDetailsSection');

  addressCards.forEach((card) => {
    card.addEventListener('click', async () => {
      const isAlreadySelected = card.classList.contains('active-address');

      if (isAlreadySelected) {
        deselectAddress(card, selectedAddressIdInput, shippingSection);
      } else {
        const currentlySelected = document.querySelector(
          '.address-card-modern.active-address'
        );
        if (currentlySelected) {
          deselectAddress(
            currentlySelected,
            selectedAddressIdInput,
            shippingSection
          );
        }
        await selectAddress(card, selectedAddressIdInput, shippingSection);
      }
    });
  });
}

function deselectAddress(card, inputElement, shippingSection) {
  card.classList.remove('active-address');
  inputElement.value = '';
  shippingSection.classList.add('d-none');
  clearAddressForm();
}

async function selectAddress(card, inputElement, shippingSection) {
  card.classList.add('active-address');
  inputElement.value = card.dataset.id;
  shippingSection.classList.remove('d-none');

  try {
    const addressData = await fetchAddressDetails(card.dataset.id);
    fillAddressForm(addressData);

    // Smooth scroll to shipping details
    shippingSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    console.error('Error fetching address details:', error);
  }
}

async function fetchAddressDetails(addressId) {
  const response = await fetch(`/account/addresses/${addressId}`);
  if (!response.ok) throw new Error('Failed to fetch address');
  return response.json();
}

function fillAddressForm(address) {
  document.getElementById('name').value = address.name || '';
  document.getElementById('mobile').value = address.mobile || '';
  document.getElementById('alternateMobile').value =
    address.alternateMobile || '';
  document.getElementById('location').value = address.location || '';
  document.getElementById('city').value = address.city || '';
  document.getElementById('state').value = address.state || '';
  document.getElementById('landmark').value = address.landmark || '';
  document.getElementById('zip').value = address.zip || '';
}

function clearAddressForm() {
  [
    'name',
    'mobile',
    'alternateMobile',
    'location',
    'city',
    'state',
    'landmark',
    'zip',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ─── Coupon Application ───────────────────────────────────────────────────────

function setupCouponApplication() {
  const couponBtn = document.getElementById('applyCouponBtn');
  const couponCodeInput = document.getElementById('couponCode');
  const cartId = couponCodeInput
    ? couponCodeInput.getAttribute('data-cartId')
    : null;
  const applyCouponDiv = document.getElementById('applyCouponDiv');
  const appliedCouponDiv = document.getElementById('appliedCouponDiv');
  const appliedCouponCodeSpan = document.getElementById('appliedCouponCode');
  const removeCouponBtn = document.getElementById('removeCouponBtn');
  const grandTotal = document.getElementById('grandTotal');

  const makeToast = () =>
    Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });

  if (couponBtn) {
    couponBtn.addEventListener('click', () => {
      const Toast = makeToast();
      const couponCode = couponCodeInput.value.trim();

      if (!couponCode) {
        Toast.fire({ icon: 'warning', title: 'Please enter a coupon code.' });
        return;
      }

      fetch('/checkout/apply-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode, cartId }),
      })
        .then((r) => r.json())
        .then((result) => {
          if (result.success) {
            Toast.fire({ icon: 'success', title: result.message });
            appliedCouponCodeSpan.querySelector('strong').textContent =
              couponCode;
            applyCouponDiv.classList.add('d-none');
            appliedCouponDiv.classList.remove('d-none');
            grandTotal.textContent = `₹${result.finalTotal.toFixed(2)}`;
          } else {
            Toast.fire({ icon: 'error', title: result.message });
          }
        })
        .catch((err) => {
          Toast.fire({ icon: 'error', title: 'Failed to apply coupon.' });
          console.error(err);
        });
    });
  }

  if (removeCouponBtn) {
    removeCouponBtn.addEventListener('click', () => {
      const Toast = makeToast();
      applyCouponDiv.classList.remove('d-none');
      appliedCouponDiv.classList.add('d-none');
      couponCodeInput.value = '';

      fetch(`/checkout/remove-coupon/${cartId}`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success) {
            Toast.fire({ icon: 'success', title: result.message });
            grandTotal.textContent = `₹${result.finalTotal.toFixed(2)}`;
          } else {
            Toast.fire({ icon: 'error', title: result.message });
          }
        })
        .catch((err) => {
          Toast.fire({ icon: 'error', title: 'Failed to remove coupon.' });
          console.error(err);
        });
    });
  }
}

// ─── Checkout Form Submit ─────────────────────────────────────────────────────

function setupCheckoutFormSubmit() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const placeOrderBtn = document.getElementById('placeOrder');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Processing…';

    const Toast = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/checkout/save-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to payment page — order is NOT created yet
        window.location.href = result.redirectUrl;
      } else {
        Toast.fire({ icon: 'error', title: result.message });
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Proceed to Payment';
      }
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: 'An unexpected error occurred. Please try again.',
      });
      console.error('Error saving address:', error);
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Proceed to Payment';
    }
  });
}
