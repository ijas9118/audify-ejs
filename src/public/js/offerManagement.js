document.addEventListener('DOMContentLoaded', () => {
  const offerTypeSelect = document.getElementById('offerType');
  const productCategorySection = document.getElementById(
    'productCategorySection'
  );
  const productOrCategorySelect = document.getElementById('productOrCategory');
  const addOfferForm = document.getElementById('addOfferForm');
  const discountTypeSelect = document.getElementById('discountType');
  const discountValueInput = document.getElementById('discountValue');
  const discountHint = document.getElementById('discountValueHintModal');

  if (
    !offerTypeSelect ||
    !productCategorySection ||
    !productOrCategorySelect ||
    !addOfferForm
  ) {
    return;
  }

  // ── Sync max & hint when discount type changes ──────────────────────────────
  function syncDiscountConstraints() {
    if (!discountTypeSelect || !discountValueInput) return;
    const isPercent = discountTypeSelect.value === 'percentage';
    discountValueInput.max = isPercent ? '100' : '';
    if (discountHint) {
      discountHint.textContent = isPercent
        ? 'Enter a value between 0.01 and 100.'
        : 'Enter a fixed discount amount in ₹.';
    }
  }

  discountTypeSelect?.addEventListener('change', syncDiscountConstraints);

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

    // Show/hide product or category selector
    if (offerType === 'product' || offerType === 'category') {
      productCategorySection.style.display = 'block';
      fetchOptions(offerType);
    } else {
      productCategorySection.style.display = 'none';
      productOrCategorySelect.innerHTML =
        '<option value="" selected>Select Product or Category</option>';
    }
  });

  addOfferForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addOffer();
  });
});

function addOffer() {
  const offerType = document.getElementById('offerType').value;
  const productOrCategory = document.getElementById('productOrCategory').value;
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(
    document.getElementById('discountValue').value
  );
  const maxDiscountAmount =
    document.getElementById('maxDiscountAmount').value || null;
  const validFrom = document.getElementById('validFrom').value;
  const validUntil = document.getElementById('validUntil').value;

  // ── Frontend validation guards ──────────────────────────────────────────────
  if (!offerType) {
    return Toast.fire({ icon: 'error', title: 'Please select an offer type.' });
  }
  if (!productOrCategory) {
    return Toast.fire({
      icon: 'error',
      title: `Please select a ${offerType}.`,
    });
  }
  if (!discountType) {
    return Toast.fire({
      icon: 'error',
      title: 'Please select a discount type.',
    });
  }
  if (!discountValue || discountValue <= 0) {
    return Toast.fire({
      icon: 'error',
      title: 'Discount value must be greater than 0.',
    });
  }
  if (discountType === 'percentage' && discountValue > 100) {
    return Toast.fire({
      icon: 'error',
      title: 'Percentage discount cannot exceed 100%.',
    });
  }
  if (!validFrom || !validUntil) {
    return Toast.fire({
      icon: 'error',
      title: 'Please provide both valid from and valid until dates.',
    });
  }
  if (new Date(validUntil) < new Date(validFrom)) {
    return Toast.fire({
      icon: 'error',
      title: 'Valid until date must be after valid from date.',
    });
  }

  const offerData = {
    type: offerType,
    product: offerType === 'product' ? productOrCategory : undefined,
    category: offerType === 'category' ? productOrCategory : undefined,
    discountType,
    discountValue,
    maxDiscountAmount,
    validFrom,
    validUntil,
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

function deleteOffer(offerId) {
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
      Toast.fire({
        icon: 'success',
        title: `Offer ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
      });
    } else {
      Toast.fire({
        icon: 'error',
        title: result.message || 'Error updating offer status.',
      });
    }
  } catch (error) {
    Toast.fire({
      icon: 'error',
      title: 'Error toggling offer status.',
    });
  }
}
