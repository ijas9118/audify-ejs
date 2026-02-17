document.addEventListener('DOMContentLoaded', () => {
  const offerTypeSelect = document.getElementById('offerType');
  const productCategorySection = document.getElementById(
    'productCategorySection'
  );
  const referralSection = document.getElementById('referralSection');
  const productOrCategorySelect = document.getElementById('productOrCategory');

  function fetchOptions(offerType) {
    const url =
      offerType === 'product'
        ? '/admin/offer-products'
        : offerType === 'category'
          ? '/admin/offer-categories'
          : null;

    if (url) {
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const options = data
            .map((item) => `<option value="${item._id}">${item.name}</option>`)
            .join('');
          productOrCategorySelect.innerHTML = `<option value="" selected>Select ${
            offerType.charAt(0).toUpperCase() + offerType.slice(1)
          }</option>${options}`;
        })
        .catch((error) => {
          console.error('Error fetching options:', error);
          productOrCategorySelect.innerHTML =
            '<option value="" selected>Error loading options</option>';
        });
    } else {
      productOrCategorySelect.innerHTML =
        '<option value="" selected>Select Product or Category</option>';
    }
  }

  offerTypeSelect.addEventListener('change', () => {
    const offerType = offerTypeSelect.value;

    // Show or hide referral section based on offer type
    if (offerType === 'referral') {
      referralSection.classList.remove('d-none');
    } else {
      referralSection.classList.add('d-none');
    }

    // Show product/category section and update options
    if (offerType === 'product' || offerType === 'category') {
      productCategorySection.style.display = 'block';
      fetchOptions(offerType);
    } else {
      productCategorySection.style.display = 'none';
      productOrCategorySelect.innerHTML =
        '<option value="" selected>Select Product or Category</option>';
    }
  });

  document.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    addOffer();
  });

  document.querySelectorAll('.edit-offer-form').forEach((form) => {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const { offerId } = this.dataset;
      updateOffer(offerId);
    });
  });
});

function addOffer() {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top', // Adjust position as needed
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  const offerType = document.getElementById('offerType').value;
  const productOrCategory = document.getElementById('productOrCategory').value;
  const discountType = document.getElementById('discountType').value;
  const discountValue = document.getElementById('discountValue').value;
  const maxDiscountAmount =
    document.getElementById('maxDiscountAmount').value || null;
  const minCartValue = document.getElementById('minCartValue').value || null;
  const validFrom = document.getElementById('validFrom').value;
  const validUntil = document.getElementById('validUntil').value;
  const referrerBonus =
    offerType === 'referral'
      ? document.getElementById('referrerBonus').value || null
      : null;
  const refereeBonus =
    offerType === 'referral'
      ? document.getElementById('refereeBonus').value || null
      : null;

  const offerData = {
    type: offerType,
    product: offerType === 'product' ? productOrCategory : undefined,
    category: offerType === 'category' ? productOrCategory : undefined,
    discountType,
    discountValue,
    maxDiscountAmount,
    minCartValue,
    validFrom,
    validUntil,
    referralBonus:
      offerType === 'referral'
        ? { referrer: referrerBonus, referee: refereeBonus }
        : undefined,
  };

  fetch('/admin/offers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(offerData),
  })
    .then((response) => response.json())
    .then(async (data) => {
      if (data.success) {
        await Toast.fire({
          icon: 'success',
          title: `${data.message}`,
        });
        const modal = bootstrap.Modal.getInstance(
          document.getElementById('addOfferModal')
        );
        modal.hide();
        window.location.reload();
      } else {
        Toast.fire({
          icon: 'error',
          title: `${data.message}`,
        });
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      Toast.fire({
        icon: 'error',
        title: 'An error occurred while adding the offer.',
      });
    });
}

function updateOffer(offerId) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top', // Adjust position as needed
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  const offerType = document.getElementById(`offerType${offerId}`).value;
  const discountType = document.getElementById(`discountType${offerId}`).value;
  const discountValue = document.getElementById(
    `discountValue${offerId}`
  ).value;
  const maxDiscountAmount =
    document.getElementById(`maxDiscount${offerId}`).value || null;
  const validFrom = document.getElementById(`validFrom${offerId}`).value;
  const validUntil = document.getElementById(`validUntil${offerId}`).value;
  const minCartValue =
    document.getElementById(`minCartValue${offerId}`).value || null;

  const offerData = {
    type: offerType,
    discountType,
    discountValue,
    maxDiscountAmount,
    validFrom,
    validUntil,
    minCartValue,
  };

  fetch(`/admin/offers/edit/${offerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(offerData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        Toast.fire({
          icon: 'success',
          title: `${data.message}`,
        });
        const modal = bootstrap.Modal.getInstance(
          document.getElementById(`editOfferModal${offerId}`)
        );
        modal.hide();
        window.location.reload();
      } else {
        Toast.fire({
          icon: 'error',
          title: `${data.message}`,
        });
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      Toast.fire({
        icon: 'error',
        title: 'An error occurred while adding the offer.',
      });
    });
}

function deleteOffer(offerId) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top', // Adjust position as needed
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  window.adminConfirm
    .open({
      title: 'Delete Offer',
      message: 'This offer will be permanently deleted.',
      confirmText: 'Delete',
      variant: 'danger',
    })
    .then((confirmed) => {
      if (!confirmed) return;
      fetch(`/admin/offers/${offerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            Toast.fire({
              icon: 'success',
              title: 'Offer deleted successfully!',
            });

            // Remove the row from the table (simple way)
            const offerRow = document.querySelector(
              `tr[data-offer-id="${offerId}"]`
            );
            if (offerRow) {
              offerRow.remove();
            }
          } else {
            Toast.fire({
              icon: 'error',
              title: `Error: ${data.message}`,
            });
          }
        });
    })
    .catch((error) => {
      console.error('Error:', error);
      Toast.fire({
        icon: 'error',
        title: 'An error occurred while deleting the offer.',
      });
    });
}

async function toggleOfferStatus(offerId) {
  const badge = document.getElementById(`statusDisplay${offerId}`);
  const currentStatus = badge.textContent.trim().toLowerCase();
  const nextAction = currentStatus === 'active' ? 'Deactivate' : 'Activate';

  const confirmed = await window.adminConfirm.open({
    title: `${nextAction} Offer`,
    message: `Do you want to ${nextAction.toLowerCase()} this offer?`,
    confirmText: nextAction,
    variant: 'danger',
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/admin/offers/toggle/${offerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      // Update the UI with the new status
      const newStatus = result.offer.status; // Get the updated value from the response

      badge.classList.remove(
        'is-positive',
        'is-negative',
        'bg-success',
        'bg-danger'
      );
      badge.classList.add(
        newStatus === 'active' ? 'is-positive' : 'is-negative'
      );
      badge.textContent = newStatus;
    } else {
      console.error('Error updating status:', result.message);
    }
  } catch (error) {
    console.error('Error toggling offer status:', error);
  }
}
