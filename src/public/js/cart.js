function changeQuantity(productId, change) {
  const quantityInput = document.getElementById(`quantity-${productId}`);
  let newQuantity = parseInt(quantityInput.value) + change;
  let Toast = Swal.mixin({
    toast: true,
    position: "top", // Adjust position as needed
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  // Ensure the quantity is valid
  if (newQuantity < 1) {
    newQuantity = 1;
  }

  fetch(`/shop/stock?productId=${productId}`)
    .then((response) => response.json())
    .then((stockData) => {
      const maxQuantity = stockData.stock;

      if (newQuantity > maxQuantity) {
        newQuantity = maxQuantity;
        Toast.fire({
          icon: "error",
          title: `Maximum available quantity for this item is ${maxQuantity}`,
        });
      }

      updateQuantityInDatabase(productId, newQuantity);
    })
    .catch(() => {
      Toast.fire({
        icon: "error",
        title: "Error fetching stock information",
      });
    });
}

function updateQuantityInDatabase(productId, newQuantity) {
  fetch("/shop/cart/updateQuantity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: productId,
      quantity: newQuantity,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((cart) => {
      updateCartUI(cart);
    })
    .catch((error) => {
      console.error("Error updating cart:", error);
    });
}

function addToCart(productId) {
  fetch(`/shop/cart/${productId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Item added to cart successfully") {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Item successfully added to your cart!",
          confirmButtonColor: "#4a2c77",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: data.message || "Failed to add item to cart",
          confirmButtonColor: "#4a2c77",
        });
      }
    })
    .catch((error) => {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "An error occurred while adding the item to your cart",
        confirmButtonColor: "#4a2c77",
      });
    });
}

function updateCartUI(cart) {
  // Update quantities and subtotals for each item
  cart.items.forEach((item) => {
    const quantityInput = document.getElementById(`quantity-${item.productId}`);
    if (quantityInput) {
      quantityInput.value = item.quantity;
    }

    const subtotalElement = document.querySelector(
      `.cart-item[data-product-id="${item.productId}"] .subtotal #subtotal-${item.productId}`
    );
    if (subtotalElement) {
      subtotalElement.textContent = `${item.subtotal.toFixed(2)}`;
    }
  });

  // Update cart summary
  const subtotalSummaryElement = document.querySelector(
    ".cart-summary .d-flex.justify-content-between span:nth-of-type(2)"
  );
  if (subtotalSummaryElement) {
    subtotalSummaryElement.textContent = `${cart.items
      .reduce((acc, item) => acc + item.subtotal, 0)
      .toFixed(2)}`;
  }

  const shippingChargeElement = document.querySelector(
    ".cart-summary .d-flex.justify-content-between:nth-of-type(2) span:nth-of-type(2)"
  );
  if (shippingChargeElement) {
    shippingChargeElement.textContent = `${cart.shippingCharge.toFixed(2)}`;
  }

  const totalElement = document.querySelector(
    ".cart-summary .total span:nth-of-type(2)"
  );
  if (totalElement) {
    totalElement.textContent = `₹${cart.total.toFixed(2)}`;
  }
}

function deleteItem(productId) {
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

  fetch(`/shop/cart/${productId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      // Include any required authentication tokens or cookies here
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data.message);

      if (data.message === "Item removed successfully") {
        // Optionally update the UI or redirect the user
        document.querySelector(`[data-product-id="${productId}"]`).remove();
        Toast.fire({
          icon: "info",
          title: "Item removed from cart",
        });
        updateCartUI(data.cart);
      } else {
        Toast.fire({
          icon: "error",
          title: "Failed to remove item",
        });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("An error occurred while removing the item");
    });
}

async function verifyStock() {
  let hasStockIssue = false;
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
    const products = await getProductIdsFromCart();

    if (products === null || products.length === 0) {
      Toast.fire({
        icon: "warning",
        title: "Your cart is empty",
      });
      hasStockIssue = true;
    } else {
      for (const product of products) {
        const { productId, quantity, name } = product;
        const response = await fetch(`/shop/stock?productId=${productId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch stock for product ID ${productId}`);
        }

        const stockData = await response.json();
        const maxQuantity = stockData.stock;

        if (maxQuantity === 0) {
          Toast.fire({
            icon: "warning",
            title: `${name} is out of stock.`,
          });
          hasStockIssue = true;
        } else if (quantity > maxQuantity) {
          Toast.fire({
            icon: "warning",
            title: `${name} only has ${maxQuantity} available, but you want ${quantity}.`,
          });
          hasStockIssue = true;
        }
      }

      if (!hasStockIssue) {
        window.location.href = "/checkout";
      }
    }
  } catch (error) {
    console.error("Error:", error);
    Toast.fire({
      icon: "error",
      title: "An error occurred while verifying stock.",
    });
    alert("An error occurred while fetching product IDs and quantities.");
  }
}

async function getProductIdsFromCart() {
  try {
    const response = await fetch("/shop/cart-item-id", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    if (!data || !Array.isArray(data.products)) {
      throw new Error("Invalid response format");
    }

    return data.products;
  } catch (error) {
    console.error("Error fetching product IDs from cart:", error.message);
    throw error;
  }
}
