async function cancelOrder(orderid) {
  // Ask for confirmation before submitting the request
  const confirmed = await Swal.fire({
    title: 'Request Cancellation?',
    text: 'Your cancellation request will be reviewed by our team. You will be notified once it is processed.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, request cancellation',
    cancelButtonText: 'No, keep my order',
    confirmButtonColor: '#dc3545',
  });

  if (!confirmed.isConfirmed) return;

  const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 4000,
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

    if (response.ok && data.requested) {
      // Request submitted — replace button with a "pending" notice without full reload
      const cancelBtn = document.getElementById('cancel-order-btn');
      if (cancelBtn) {
        cancelBtn.outerHTML = `
          <div class="alert alert-warning d-flex align-items-center gap-2 mt-2" role="alert">
            <i class="fa-solid fa-clock"></i>
            <span>Cancellation request submitted. Awaiting admin review.</span>
          </div>
        `;
      } else {
        // Fallback if button element not found
        window.location.reload();
      }

      await Toast.fire({
        icon: 'info',
        title: data.message,
      });
    } else {
      Toast.fire({
        icon: 'error',
        title: data.message || 'Could not submit cancellation request.',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.fire({
      icon: 'error',
      title: 'An error occurred. Please try again.',
    });
  }
}

function downloadInvoice(orderId) {
  const invoiceUrl = `/account/order/${orderId}/invoice`;
  window.location.href = invoiceUrl;
}
