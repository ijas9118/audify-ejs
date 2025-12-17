async function cancelOrder(orderid) {
  let Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  try {
    const response = await fetch(`/account/order-history/cancel/${orderid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (response.ok) {
      await Toast.fire({
        icon: "success",
        title: "Order Cancelled! Refunded to wallet",
      });
      window.location.reload();
    } else {
      alert(data.message || 'Failed to remove product');
      Toast.fire({
        icon: "error",
        title: data.message,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.fire({
      icon: "error",
      title: 'An error occurred. Please try again.',
    });
  }
}
function downloadInvoice(orderId) {
  const invoiceUrl = `/account/order/${orderId}/invoice`;
  window.location.href = invoiceUrl;
}