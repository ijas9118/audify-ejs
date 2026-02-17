async function updateOrderStatus(orderId, selectElement) {
  const nextStatus = selectElement.value;
  const previousStatus = selectElement.dataset.previousValue || '';

  const confirmed = await window.adminConfirm.open({
    title: 'Update Order Status',
    message: `Change order status from "${previousStatus || 'current'}" to "${nextStatus}"?`,
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
      selectElement.value = previousStatus || selectElement.value;
      alert('Error updating order status');
      return;
    }

    selectElement.dataset.previousValue = nextStatus;
    alert('Order status updated successfully');
  } catch (error) {
    selectElement.value = previousStatus || selectElement.value;
    alert('Error updating order status');
  }
}
