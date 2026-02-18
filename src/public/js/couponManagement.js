document
  .querySelector('#addCouponform')
  .addEventListener('submit', async (event) => {
    event.preventDefault();

    const couponCode = document.getElementById('couponCode').value;
    const discountType = document.getElementById('discountType').value;
    const discountValue = document.getElementById('discountValue').value;
    const maxDiscountValue = document.getElementById('maxDiscountValue').value;
    const minCartValue = document.getElementById('minCartValue').value;
    const validFrom = document.getElementById('validFrom').value;
    const validUntil = document.getElementById('validUntil').value;
    const usageLimit = document.getElementById('usageLimit').value;
    const isActive = document.getElementById('isActive').value === 'true';

    if (
      !couponCode ||
      !discountType ||
      !discountValue ||
      !validFrom ||
      !validUntil
    ) {
      await Toast.fire({
        icon: 'warning',
        title: 'Please fill in all required fields',
      });
      return;
    }

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
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
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
        document.getElementById('addCouponform').reset();

        // Hide the modal
        const addCouponModal = new bootstrap.Modal(
          document.getElementById('addCouponModal')
        );
        addCouponModal.hide();
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

async function deleteCoupon(couponId) {
  const confirmDelete = await window.adminConfirm.open({
    title: 'Delete Coupon',
    message: 'This coupon will be permanently deleted.',
    confirmText: 'Delete',
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
      // Remove the coupon's row from the table
      const row = document.querySelector(`tr[data-coupon-id="${couponId}"]`);
      if (row) row.remove();

      Toast.fire({
        icon: 'success',
        title: 'Coupon deleted successfully!',
      });
    } else {
      Toast.fire({
        icon: 'error',
        title: `Error deleting coupon: ${getErrorMessage(result)}`,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.fire({
      icon: 'error',
      title: 'An error occurred while deleting the coupon.',
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
