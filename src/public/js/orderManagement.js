function updateOrderStatus(orderId, status) {
  fetch(`/admin/orders/update-status/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("Order status updated successfully");
      } else {
        alert("Error updating order status");
      }
    });
}
