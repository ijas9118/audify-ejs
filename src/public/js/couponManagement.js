const addCouponForm = document.getElementById('addCouponForm');

if (addCouponForm) {
  const couponCodeField = document.getElementById('couponCode');
  const discountTypeField = document.getElementById('discountType');
  const discountValueField = document.getElementById('discountValue');
  const maxDiscountValueField = document.getElementById('maxDiscountValue');
  const minCartValueField = document.getElementById('minCartValue');
  const validFromField = document.getElementById('validFrom');
  const validUntilField = document.getElementById('validUntil');
  const perUserLimitField = document.getElementById('perUserLimit');
  const totalUsageLimitField = document.getElementById('totalUsageLimit');

  const getFeedback = (field) =>
    field?.parentElement?.querySelector('.invalid-feedback');

  const updateFieldMessage = (field) => {
    const feedback = getFeedback(field);
    if (!feedback || !field) {
      return;
    }

    field.setCustomValidity('');

    if (field.validity.valueMissing) {
      feedback.textContent =
        field.dataset.msgRequired || 'This field is required.';
      return;
    }

    if (field === couponCodeField) {
      const code = field.value.trim().toUpperCase();
      if (code && !/^[A-Z0-9]{3,20}$/.test(code)) {
        field.setCustomValidity('Coupon code must be 3-20 letters or numbers.');
        feedback.textContent = 'Coupon code must be 3-20 letters or numbers.';
        return;
      }
    }

    if (field === discountValueField) {
      const discountType = discountTypeField.value;
      const discountValue = Number(field.value);
      if (
        discountType === 'percentage' &&
        Number.isFinite(discountValue) &&
        discountValue > 100
      ) {
        field.setCustomValidity('Percentage discount cannot exceed 100.');
        feedback.textContent = 'Percentage discount cannot exceed 100.';
        return;
      }
    }

    if (field === validUntilField) {
      const start = validFromField.value ? new Date(validFromField.value) : null;
      const end = field.value ? new Date(field.value) : null;
      if (
        start &&
        end &&
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end < start
      ) {
        field.setCustomValidity('Valid until date must be after valid from date.');
        feedback.textContent = 'Valid until date must be after valid from date.';
        return;
      }
    }

    if (!field.validity.valid) {
      feedback.textContent =
        field.dataset.msgInvalid || 'Please enter a valid value.';
    }
  };

  [
    couponCodeField,
    discountTypeField,
    discountValueField,
    maxDiscountValueField,
    minCartValueField,
    validFromField,
    validUntilField,
    perUserLimitField,
    totalUsageLimitField,
  ].forEach((field) => {
    if (!field) {
      return;
    }
    field.addEventListener('input', () => updateFieldMessage(field));
    field.addEventListener('change', () => updateFieldMessage(field));
  });

  discountTypeField?.addEventListener('change', () => {
    updateFieldMessage(discountValueField);
  });

  validFromField?.addEventListener('change', () => {
    updateFieldMessage(validUntilField);
  });

  addCouponForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    [
      couponCodeField,
      discountTypeField,
      discountValueField,
      maxDiscountValueField,
      minCartValueField,
      validFromField,
      validUntilField,
      perUserLimitField,
      totalUsageLimitField,
    ].forEach((field) => updateFieldMessage(field));

    if (!addCouponForm.checkValidity()) {
      addCouponForm.classList.add('was-validated');
      return;
    }

    const couponCode = couponCodeField.value;
    const discountType = discountTypeField.value;
    const discountValue = discountValueField.value;
    const maxDiscountValue = maxDiscountValueField.value;
    const minCartValue = minCartValueField.value;
    const validFrom = validFromField.value;
    const validUntil = validUntilField.value;
    const perUserLimit = perUserLimitField.value;
    const totalUsageLimit = totalUsageLimitField.value;
    const isActive = document.getElementById('isActive').value === 'true';

    const couponData = {
      code: couponCode.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      maxDiscountValue: maxDiscountValue
        ? parseFloat(maxDiscountValue)
        : undefined,
      minCartValue: minCartValue ? parseFloat(minCartValue) : 0,
      validFrom, // New field for start date
      validUntil, // Updated field for expiration date
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
      totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit, 10) : 0,
      isActive,
    };

    try {
      const response = await fetch('/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(couponData),
      });

      const result = await parseApiResponse(response);

      if (response.ok) {
        await Toast.fire({
          icon: 'success',
          title: 'Coupon added successfully!',
        });
        addCouponForm.reset();
        addCouponForm.classList.remove('was-validated');

        // Hide the modal
        const addCouponModalEl = document.getElementById('addCouponModal');
        const addCouponModal =
          bootstrap.Modal.getInstance(addCouponModalEl) ||
          new bootstrap.Modal(addCouponModalEl);
        addCouponModal.hide();
        addCouponModalEl.addEventListener(
          'hidden.bs.modal',
          () => {
            addCouponForm.classList.remove('was-validated');
          },
          { once: true }
        );
        window.location.reload();
      } else {
        Toast.fire({
          icon: 'error',
          title: `Error adding coupon: ${getErrorMessage(result)}`,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Toast.fire({
        icon: 'error',
        title: 'An error occurred while adding the coupon.',
      });
    }
  });
}

async function deleteCoupon(couponId) {
  const confirmDelete = await window.adminConfirm.open({
    title: 'Archive Coupon',
    message: 'This coupon will be soft deleted and hidden from active listings.',
    confirmText: 'Archive',
    variant: 'danger',
  });

  if (!confirmDelete) {
    return; // Exit if the user cancels the deletion
  }

  try {
    const response = await fetch(`/admin/coupons/${couponId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const result = await parseApiResponse(response);

    if (response.ok) {
      Toast.fire({
        icon: 'success',
        title: 'Coupon archived successfully!',
      });

      // Refresh to keep pagination and filtered lists aligned with server state.
      window.location.reload();
    } else {
      Toast.fire({
        icon: 'error',
        title: `Error archiving coupon: ${getErrorMessage(result)}`,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.fire({
      icon: 'error',
      title: 'An error occurred while archiving the coupon.',
    });
  }
}

async function toggleCouponStatus(couponId) {
  const badge = document.getElementById(`isActiveDisplay${couponId}`);
  const currentIsActive = badge.textContent.trim().toLowerCase() === 'active';
  const nextAction = currentIsActive ? 'Deactivate' : 'Activate';

  const confirmed = await window.adminConfirm.open({
    title: `${nextAction} Coupon`,
    message: `Do you want to ${nextAction.toLowerCase()} this coupon?`,
    confirmText: nextAction,
    variant: 'danger',
  });

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/admin/coupons/toggle/${couponId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const result = await parseApiResponse(response);

    if (result.success) {
      // Update the UI with the new status
      const newStatus = result.coupon.isActive; // Get the updated value from the response

      badge.classList.remove(
        'is-positive',
        'is-negative',
        'bg-success',
        'bg-danger'
      );
      badge.classList.add(newStatus ? 'is-positive' : 'is-negative');
      badge.textContent = newStatus ? 'Active' : 'Inactive';
      Toast.fire({
        icon: 'success',
        title: `Coupon ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    } else {
      Toast.fire({
        icon: 'error',
        title: getErrorMessage(result),
      });
    }
  } catch (error) {
    Toast.fire({
      icon: 'error',
      title: 'Error toggling coupon status.',
    });
  }
}

function getErrorMessage(result) {
  if (!result) {
    return 'Unknown error';
  }
  if (result.message) {
    return result.message;
  }
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return result.errors[0].msg || 'Validation failed';
  }
  return 'Unknown error';
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const rawText = await response.text();
  return {
    success: false,
    message:
      rawText && rawText.trim()
        ? 'Request failed and server returned non-JSON response'
        : 'Request failed',
  };
}
