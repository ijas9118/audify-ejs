async function updateOrderStatus(orderId, selectElement) {
  const nextStatus = selectElement.value;
  const previousStatus = selectElement.dataset.previousValue || '';

  // Don't even call the server if nothing changed
  if (nextStatus === previousStatus) return;

  const confirmed = await window.adminConfirm.open({
    title: 'Update Order Status',
    message: `Change order status from ${previousStatus || 'current'} to ${nextStatus}?`,
    confirmText: 'Update Status',
    variant: 'danger',
  });

  if (!confirmed) {
    selectElement.value = previousStatus || selectElement.value;
    return;
  }

  try {
    const response = await fetch(`/admin/orders/update/${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();

    if (!data.success) {
      // Revert the select back to the previous valid state
      selectElement.value = previousStatus || selectElement.value;

      // Show the exact server error (state machine violation, etc.)
      Toast.fire({
        icon: 'error',
        title: data.message || 'Could not update order status.',
      });
      return;
    }

    // Persist the new value as the baseline for future changes
    selectElement.dataset.previousValue = nextStatus;
    Toast.fire({
      icon: 'success',
      title: 'Order status updated successfully.',
    });
  } catch (error) {
    selectElement.value = previousStatus || selectElement.value;
    Toast.fire({
      icon: 'error',
      title: 'Network error — could not update order status.',
    });
  }
}
