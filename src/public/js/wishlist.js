// Lazy factory — Swal is loaded by layout.ejs AFTER page scripts.
function getToast() {
  return Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
}

// ── Remove a wishlist item from the DOM (no full-page reload) ─────────────────
function removeItemFromDOM(productId) {
  const el = document.getElementById(`wishlist-item-${productId}`);
  if (el) {
    el.remove();
  }

  // If no more items, swap list area with the empty-state message
  const remaining = document.querySelectorAll('.wishlist-item');
  if (remaining.length === 0) {
    const container = document.querySelector('.container.my-4');
    if (container) {
      container.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h1 class="mb-0">Your Wishlist</h1>
        </div>
        <div class="alert alert-info text-center" role="alert">
          <i class="fa-solid fa-heart me-2"></i>Your wishlist is empty.
          <a href="/shop" class="alert-link ms-1">Browse the shop</a> to add items!
        </div>
      `;
    }
  }
}

// ── Add to wishlist (called from shop/product pages) ─────────────────────────
async function addToWishList(productId) {
  try {
    const response = await fetch(`/shop/wishlist/add/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    if (response.ok) {
      getToast().fire({ icon: 'success', title: 'Added to wishlist!' });
    } else if (response.status === 409) {
      getToast().fire({ icon: 'info', title: 'Already in your wishlist' });
    } else {
      getToast().fire({
        icon: 'error',
        title: data.message || 'Failed to add to wishlist',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    getToast().fire({
      icon: 'error',
      title: 'An error occurred. Please try again.',
    });
  }
}

// ── Move single item from wishlist → cart ─────────────────────────────────────
async function addToCartFromWishlist(productId) {
  try {
    const response = await fetch(`/shop/cart/add/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    if (response.ok) {
      // Remove from wishlist silently (fire-and-forget; page shows removal)
      await fetch(`/shop/wishlist/delete/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      removeItemFromDOM(productId);
      getToast().fire({ icon: 'success', title: 'Moved to cart!' });
    } else {
      getToast().fire({
        icon: 'error',
        title: data.message || 'Failed to add product to cart',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    getToast().fire({
      icon: 'error',
      title: 'An error occurred. Please try again.',
    });
  }
}

// ── Remove from wishlist ──────────────────────────────────────────────────────
async function removeProduct(productId) {
  try {
    const response = await fetch(`/shop/wishlist/delete/${productId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      removeItemFromDOM(productId);
      getToast().fire({ icon: 'info', title: 'Removed from wishlist' });
    } else {
      const data = await response.json();
      getToast().fire({
        icon: 'error',
        title: data.message || 'Failed to remove item',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    getToast().fire({
      icon: 'error',
      title: 'An error occurred. Please try again.',
    });
  }
}

// ── Move ALL wishlist items to cart ──────────────────────────────────────────
async function moveAllToCart() {
  const btn = document.getElementById('move-all-to-cart-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Moving…';
  }

  const items = [...document.querySelectorAll('.wishlist-item')];
  let movedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    // Extract productId from the element id: "wishlist-item-<id>"
    const productId = item.id.replace('wishlist-item-', '');

    // Skip out-of-stock items (button is hidden, but guard here too)
    if (item.querySelector('.badge.bg-danger')) {
      failedCount += 1;
      continue; // eslint-disable-line no-continue
    }

    /* eslint-disable no-await-in-loop */
    const cartRes = await fetch(`/shop/cart/add/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (cartRes && cartRes.ok) {
      await fetch(`/shop/wishlist/delete/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);
      removeItemFromDOM(productId);
      movedCount += 1;
    } else {
      failedCount += 1;
    }
    /* eslint-enable no-await-in-loop */
  }

  if (movedCount > 0 && failedCount === 0) {
    getToast().fire({
      icon: 'success',
      title: `${movedCount} item(s) moved to cart!`,
    });
  } else if (movedCount > 0) {
    getToast().fire({
      icon: 'warning',
      title: `${movedCount} moved, ${failedCount} could not be added (out of stock or limit reached).`,
    });
  } else {
    getToast().fire({ icon: 'error', title: 'Could not move items to cart.' });
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-cart-plus me-1"></i> Move All to Cart';
  }
}
