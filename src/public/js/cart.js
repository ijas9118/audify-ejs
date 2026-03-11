// Lazy factory — Swal is loaded by layout.ejs AFTER page scripts, so we
// must NOT call Swal at the top level. Each function calls getToast() instead.
function getToast() {
  return Swal.mixin({
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
}

// ── Quantity change (with Debouncing and Optimistic UI) ────────────────────────
const quantityUpdateTimers = {};

function changeQuantity(productId, change) {
  const quantityInput = document.getElementById(`quantity-${productId}`);
  const currentQuantity = parseInt(quantityInput.value, 10);
  let newQuantity = currentQuantity + change;

  // Local validation
  if (newQuantity < 1) return;
  if (newQuantity > 5) {
    getToast().fire({ icon: 'warning', title: 'Maximum 5 units allowed' });
    return;
  }

  // 1. Instant UI update (Optimistic)
  quantityInput.value = newQuantity;

  // 2. Clear previous timer for this specific product
  if (quantityUpdateTimers[productId]) {
    clearTimeout(quantityUpdateTimers[productId]);
  }

  // 3. Set a new timer (Debounce)
  quantityUpdateTimers[productId] = setTimeout(() => {
    // 4. Background check and sync
    fetch(`/shop/stock?productId=${productId}`)
      .then((response) => response.json())
      .then((stockData) => {
        if (newQuantity > stockData.stock) {
          // Revert if stock is insufficient
          quantityInput.value = stockData.stock;
          updateQuantityInDatabase(productId, stockData.stock);
          getToast().fire({
            icon: 'warning',
            title: `Only ${stockData.stock} units available`,
          });
        } else {
          updateQuantityInDatabase(productId, newQuantity);
        }
      })
      .catch(() => {
        // Revert to something safe if stock API fails
        getToast().fire({ icon: 'error', title: 'Error checking stock' });
      });

    // Cleanup timer reference
    delete quantityUpdateTimers[productId];
  }, 500); // 500ms delay
}

// ── Persist quantity to database ─────────────────────────────────────────────
function updateQuantityInDatabase(productId, newQuantity) {
  fetch('/shop/cart/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: newQuantity }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        updateCartUI(data.cart);
        // If a coupon was cleared, let the user know
        if (
          !data.cart.appliedCoupon &&
          document.getElementById('coupon-display')
        ) {
          document.getElementById('coupon-display').textContent = '';
          getToast().fire({
            icon: 'info',
            title: 'Coupon removed — cart updated. Please re-apply if needed.',
          });
        }
      } else {
        // Server rejected the quantity (stock limit, inactive product, etc.)
        const quantityInput = document.getElementById(`quantity-${productId}`);
        if (quantityInput) {
          // Revert to previous valid value
          quantityInput.value = parseInt(
            quantityInput.dataset.lastValid || 1,
            10
          );
        }
        getToast().fire({
          icon: 'error',
          title: data.message || 'Could not update quantity',
        });
      }
    })
    .catch(() => {
      getToast().fire({ icon: 'error', title: 'Error updating cart' });
    });
}

// ── Add to cart (called from shop/product pages) ─────────────────────────────
function addToCart(productId) {
  fetch(`/shop/cart/add/${productId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: 'Item successfully added to your cart.',
          confirmButtonColor: '#4a2c77',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops!',
          text: data.message || 'Failed to add item to cart',
          confirmButtonColor: '#4a2c77',
        });
      }
    })
    .catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'An error occurred while adding the item to your cart',
        confirmButtonColor: '#4a2c77',
      });
    });
}

// ── Update cart summary in the DOM ───────────────────────────────────────────
function updateCartUI(cart) {
  // Per-item quantity and subtotal
  cart.items.forEach((item) => {
    const quantityInput = document.getElementById(`quantity-${item.productId}`);
    if (quantityInput) {
      quantityInput.value = item.quantity;
      quantityInput.dataset.lastValid = item.quantity;
    }

    const subtotalEl = document.getElementById(`subtotal-${item.productId}`);
    if (subtotalEl) {
      subtotalEl.textContent = item.subtotal.toFixed(2);
    }
  });

  // Summary: items subtotal
  const summaryRows = document.querySelectorAll('.summary-card .summary-row');
  if (summaryRows.length >= 2) {
    const rawSubtotal = cart.items.reduce(
      (acc, item) => acc + item.subtotal,
      0
    );
    summaryRows[0].querySelector('span:last-child').textContent =
      `₹${rawSubtotal.toFixed(2)}`;

    // Summary: shipping
    const shippingVal =
      cart.shippingCharge === 0 ? 'FREE' : `₹${cart.shippingCharge.toFixed(2)}`;
    summaryRows[1].querySelector('span:last-child').textContent = shippingVal;
  }

  // Summary: grand total
  const totalEl = document.querySelector('.summary-total span:last-child');
  if (totalEl) {
    totalEl.textContent = `₹${cart.total.toFixed(2)}`;
  }
}

// ── Delete a single cart item ────────────────────────────────────────────────
function deleteItem(productId) {
  fetch(`/shop/cart/delete/${productId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Remove the row from the DOM
        const row = document.querySelector(`[data-product-id="${productId}"]`);
        if (row) row.remove();

        getToast().fire({ icon: 'info', title: 'Item removed from cart' });

        if (data.cart.items.length === 0) {
          // Cart now empty — show the modern empty state
          const container = document.querySelector(
            '.shopping-container .container'
          );
          if (container) {
            container.innerHTML = `
              <h1 class="shopping-title">Your Cart</h1>
              <div class="empty-state">
                <div class="empty-state-icon">
                  <i class="fa-solid fa-cart-shopping"></i>
                </div>
                <h3 class="fw-bold">Your cart is empty</h3>
                <p class="text-secondary mb-4">Seems like you haven't added anything to your cart yet.</p>
                <a href="/shop" class="btn btn-primary-modern px-5 justify-content-center">Shop Now</a>
              </div>
            `;
          }
        } else {
          updateCartUI(data.cart);
        }
      } else {
        getToast().fire({ icon: 'error', title: 'Failed to remove item' });
      }
    })
    .catch(() => {
      getToast().fire({
        icon: 'error',
        title: 'An error occurred while removing the item',
      });
    });
}

// ── Checkout: verify stock before redirecting ────────────────────────────────
async function verifyStock() {
  let hasStockIssue = false;

  try {
    const products = await getProductIdsFromCart();

    if (!products || products.length === 0) {
      getToast().fire({ icon: 'warning', title: 'Your cart is empty' });
      return;
    }

    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const product of products) {
      const { productId, quantity, name } = product;
      const response = await fetch(`/shop/stock?productId=${productId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stock for ${productId}`);
      }

      const { stock } = await response.json();

      if (stock === 0) {
        getToast().fire({ icon: 'warning', title: `${name} is out of stock.` });
        hasStockIssue = true;
      } else if (quantity > stock) {
        getToast().fire({
          icon: 'warning',
          title: `${name}: only ${stock} available, but ${quantity} in cart.`,
        });
        hasStockIssue = true;
      }
    }
    /* eslint-enable no-await-in-loop, no-restricted-syntax */

    if (!hasStockIssue) {
      window.location.href = '/checkout';
    }
  } catch (error) {
    console.error('Error:', error);
    getToast().fire({
      icon: 'error',
      title: 'An error occurred while verifying stock.',
    });
  }
}

async function getProductIdsFromCart() {
  const response = await fetch('/shop/cart/get-cart-item', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();

  if (!data || !Array.isArray(data.products)) {
    throw new Error('Invalid response format');
  }

  return data.products;
}
