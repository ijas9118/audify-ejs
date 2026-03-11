(() => {
  // ─── Config ────────────────────────────────────────────────────────────────
  const configEl = document.getElementById('paymentConfig');
  const RAZORPAY_KEY = configEl ? configEl.dataset.razorpayKey : '';
  const FINAL_TOTAL = configEl ? parseFloat(configEl.dataset.finaltotal) : 0;
  const SHIPPING_NAME = configEl ? configEl.dataset.shippingName : '';
  const SHIPPING_MOBILE = configEl ? configEl.dataset.shippingMobile : '';

  // ─── Toast helper ──────────────────────────────────────────────────────────
  const makeToast = () =>
    Swal.mixin({
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

  // ─── Disable/Enable button ─────────────────────────────────────────────────
  const setButtonState = (btn, disabled, text) => {
    btn.disabled = disabled;
    btn.innerHTML = disabled
      ? `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${text}`
      : `<i class="fas fa-lock me-2"></i>${text}`;
  };

  // ─── Redirect to success ───────────────────────────────────────────────────
  const redirectToSuccess = (orderId) => {
    window.location.href = `/checkout/order-success/${orderId}`;
  };

  // ─── Form submit ───────────────────────────────────────────────────────────
  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const Toast = makeToast();
      const confirmBtn = document.getElementById('confirmBtn');
      const checkedInput = document.querySelector(
        'input[name="paymentMethod"]:checked'
      );

      if (!checkedInput) {
        Toast.fire({
          icon: 'warning',
          title: 'Please select a payment method.',
        });
        return;
      }

      const paymentMethod = checkedInput.value;

      setButtonState(confirmBtn, true, 'Processing…');

      try {
        if (paymentMethod === 'Razorpay') {
          await handleRazorpay(confirmBtn, Toast);
        } else if (paymentMethod === 'COD') {
          await handleCOD(confirmBtn, Toast);
        } else if (paymentMethod === 'Wallet') {
          await handleWallet(confirmBtn, Toast);
        }
      } catch (error) {
        console.error('Unexpected payment error:', error);
        Toast.fire({
          icon: 'error',
          title: 'An unexpected error occurred. Please try again.',
        });
        setButtonState(confirmBtn, false, 'Confirm and Place Order');
      }
    });
  }

  // ─── COD Handler ───────────────────────────────────────────────────────────
  async function handleCOD(confirmBtn, Toast) {
    try {
      const response = await fetch('/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();

      if (result.success) {
        await Toast.fire({ icon: 'success', title: result.message });
        redirectToSuccess(result.orderId);
      } else {
        Toast.fire({
          icon: 'error',
          title: result.message || 'Failed to place COD order.',
        });
        setButtonState(confirmBtn, false, 'Confirm and Place Order');
      }
    } catch {
      Toast.fire({
        icon: 'error',
        title: 'Failed to place COD order. Please try again.',
      });
      setButtonState(confirmBtn, false, 'Confirm and Place Order');
    }
  }

  // ─── Wallet Handler ────────────────────────────────────────────────────────
  async function handleWallet(confirmBtn, Toast) {
    try {
      const response = await fetch('/checkout/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();

      if (result.success) {
        await Toast.fire({ icon: 'success', title: result.message });
        redirectToSuccess(result.orderId);
      } else {
        Toast.fire({
          icon: 'error',
          title: result.message || 'Failed to process wallet payment.',
        });
        setButtonState(confirmBtn, false, 'Confirm and Place Order');
      }
    } catch {
      Toast.fire({
        icon: 'error',
        title: 'Failed to process wallet payment. Please try again.',
      });
      setButtonState(confirmBtn, false, 'Confirm and Place Order');
    }
  }

  // ─── Razorpay Handler ──────────────────────────────────────────────────────
  async function handleRazorpay(confirmBtn, Toast) {
    // Step 1: Create Razorpay order on server (from cart total, no DB order yet)
    let razorpayOrder;
    let shipping;

    try {
      const response = await fetch('/checkout/razorpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!data.success) {
        Toast.fire({
          icon: 'error',
          title: data.message || 'Failed to initiate payment.',
        });
        setButtonState(confirmBtn, false, 'Confirm and Place Order');
        return;
      }

      razorpayOrder = data.order;
      shipping = data.shipping;
    } catch {
      Toast.fire({
        icon: 'error',
        title: 'Failed to connect to payment server. Please try again.',
      });
      setButtonState(confirmBtn, false, 'Confirm and Place Order');
      return;
    }

    // Step 2: Open Razorpay modal
    const options = {
      key: RAZORPAY_KEY,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'Audify',
      description: 'Order Payment',
      order_id: razorpayOrder.id,

      // Step 3: On payment success → verify on server → create DB order
      async handler(response) {
        const verifyToast = makeToast();
        try {
          const verifyResponse = await fetch('/checkout/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyResult = await verifyResponse.json();

          if (verifyResult.success) {
            await verifyToast.fire({
              icon: 'success',
              title: 'Payment successful! Placing your order…',
            });
            redirectToSuccess(verifyResult.orderId);
          } else if (
            verifyResult.message?.includes('Invalid payment signature')
          ) {
            // Signature mismatch — payment likely NOT captured
            Swal.fire({
              icon: 'error',
              title: 'Payment Verification Failed',
              text: 'We could not verify your payment. If money was deducted, please contact support.',
              confirmButtonText: 'OK',
            });
            setButtonState(confirmBtn, false, 'Confirm and Place Order');
          } else if (verifyResult.autoRefunded === true) {
            // ✅ Payment captured but order failed — refund was auto-initiated
            Swal.fire({
              icon: 'info',
              title: 'Order Could Not Be Placed',
              html: `
                <p>${verifyResult.message}</p>
              `,
              confirmButtonText: 'Continue Shopping',
            }).then(() => {
              window.location.href = '/shop';
            });
          } else if (verifyResult.autoRefunded === false) {
            // ❌ Payment captured AND refund also failed — manual support required
            Swal.fire({
              icon: 'error',
              title: 'Refund Required',
              html: `
                <p>${verifyResult.message || 'Your payment was received but the order and refund both failed.'}</p>
                <p class="mt-2">Your payment ID:<br><code>${verifyResult.paymentId || response.razorpay_payment_id}</code></p>
                <p class="text-muted small mt-2">Please contact support with this ID for a manual refund.</p>
              `,
              confirmButtonText: 'Contact Support',
              showCancelButton: true,
              cancelButtonText: 'Go to My Account',
            }).then((swalResult) => {
              if (!swalResult.isConfirmed) {
                window.location.href = '/account';
              }
            });
            setButtonState(confirmBtn, false, 'Confirm and Place Order');
          } else {
            // Generic fallback
            Swal.fire({
              icon: 'error',
              title: 'Payment Error',
              text:
                verifyResult.message ||
                'Something went wrong. Please contact support.',
              confirmButtonText: 'OK',
            });
            setButtonState(confirmBtn, false, 'Confirm and Place Order');
          }
        } catch {
          Swal.fire({
            icon: 'error',
            title: 'Verification Error',
            text: 'Payment may have been deducted. Please contact support with your payment ID.',
            confirmButtonText: 'OK',
          });
          setButtonState(confirmBtn, false, 'Confirm and Place Order');
        }
      },

      prefill: {
        name: shipping ? shipping.name : SHIPPING_NAME,
        contact: shipping ? shipping.mobile : SHIPPING_MOBILE,
      },

      theme: { color: '#212529' },

      modal: {
        ondismiss() {
          // User closed the modal without paying — re-enable button for retry
          Toast.fire({
            icon: 'info',
            title: 'Payment cancelled. You can try again.',
          });
          setButtonState(confirmBtn, false, 'Confirm and Place Order');
        },
      },
    };

    const rzp = new window.Razorpay(options);

    // Step 4: Handle payment failure with retry option
    rzp.on('payment.failed', (failResponse) => {
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        html: `
          <p>${failResponse.error.description || 'Your payment could not be processed.'}</p>
          <small class="text-muted">Reason: ${failResponse.error.reason || 'Unknown'}</small>
        `,
        confirmButtonText: 'Try Again',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
      }).then((swalResult) => {
        if (swalResult.isConfirmed) {
          // Re-open the Razorpay modal for retry
          rzp.open();
        } else {
          setButtonState(confirmBtn, false, 'Confirm and Pay');
        }
      });
    });

    rzp.open();
  }
})();
