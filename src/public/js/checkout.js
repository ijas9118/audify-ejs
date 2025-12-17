document.addEventListener("DOMContentLoaded", () => {
  // Address selection functionality
  setupAddressSelection();

  setupCouponApplication();
});

// Function to handle address selection
function setupAddressSelection() {
  const addressCards = document.querySelectorAll(".address-card");
  const selectedAddressIdInput = document.getElementById("selectedAddressId");

  addressCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const currentlySelectedCard = document.querySelector(
        ".address-card.active-address"
      );

      if (card.classList.contains("active-address")) {
        deselectAddress(card, selectedAddressIdInput);
      } else {
        if (currentlySelectedCard) {
          deselectAddress(currentlySelectedCard, selectedAddressIdInput);
        }
        selectAddress(card, selectedAddressIdInput);
      }
    });
  });
}

// Function to handle address deselection
function deselectAddress(card, inputElement) {
  card.classList.remove("active-address");
  inputElement.value = ""; // Clear the hidden input
  clearAddressForm(); // Optionally clear form fields
}

// Function to handle address selection
async function selectAddress(card, inputElement) {
  card.classList.add("active-address");
  inputElement.value = card.dataset.id; // Set the hidden input with the selected address ID

  try {
    const addressData = await fetchAddressDetails(card.dataset.id);
    fillAddressForm(addressData);
  } catch (error) {
    console.error("Error fetching address details:", error);
  }
}

// Function to fetch address details from the server
async function fetchAddressDetails(addressId) {
  const response = await fetch(`/account/addresses/${addressId}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

// Function to fill address form fields
function fillAddressForm(address) {
  document.getElementById("name").value = address.name || "";
  document.getElementById("mobile").value = address.mobile || "";
  document.getElementById("alternateMobile").value =
    address.alternateMobile || "";
  document.getElementById("location").value = address.location || "";
  document.getElementById("city").value = address.city || "";
  document.getElementById("state").value = address.state || "";
  document.getElementById("landmark").value = address.landmark || "";
  document.getElementById("zip").value = address.zip || "";
}

// Function to clear address form fields
function clearAddressForm() {
  document.getElementById("name").value = "";
  document.getElementById("mobile").value = "";
  document.getElementById("alternateMobile").value = "";
  document.getElementById("location").value = "";
  document.getElementById("city").value = "";
  document.getElementById("state").value = "";
  document.getElementById("landmark").value = "";
  document.getElementById("zip").value = "";
}

const couponBtn = document.getElementById("applyCouponBtn");
const couponCodeInput = document.getElementById("couponCode");
const cartId = couponCode.getAttribute("data-cartId");
const applyCouponDiv = document.getElementById("applyCouponDiv");
const appliedCouponDiv = document.getElementById("appliedCouponDiv");
const appliedCouponCodeSpan = document.getElementById("appliedCouponCode");
const removeCouponBtn = document.getElementById("removeCouponBtn");
const grandTotal = document.getElementById('grandTotal');

couponBtn.addEventListener("click", () => {
  let Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
  const couponCode = couponCodeInput.value.trim();
  if (couponCode) {
    const data = {
      couponCode,
      cartId,
    };
    fetch("/checkout/apply-coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          Toast.fire({
            icon: "success",
            title: result.message,
          });
          appliedCouponCodeSpan.querySelector("strong").textContent =
            couponCode;
          applyCouponDiv.classList.add("d-none");
          appliedCouponDiv.classList.remove("d-none");
          grandTotal.textContent = `₹${result.finalTotal.toFixed(2)}`;
        } else {
          Toast.fire({
            icon: "error",
            title: result.message,
          });
          console.error("Failed to apply coupon:", couponCode, result.message);
        }
      })
      .catch((error) => {
        Toast.fire({
          icon: "error",
          title: `Error: ${error}`,
        });
        console.error("Error:", error);
      });
  } else {
    Toast.fire({
      icon: "warning",
      title: "Please enter a coupon code.",
    });
    console.log("Please enter a coupon code.");
  }
});

removeCouponBtn.addEventListener("click", async () => {
  applyCouponDiv.classList.remove("d-none");
  appliedCouponDiv.classList.add("d-none");
  couponCodeInput.value = "";

  let Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  fetch(`/checkout/remove-coupon/${cartId}`)
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        Toast.fire({
          icon: "success",
          title: result.message,
        });
        grandTotal.textContent = `₹${result.finalTotal.toFixed(2)}`; 
      } else {
        Toast.fire({
          icon: "error",
          title: result.message,
        });
      }
    })
    .catch((error) => {
      Toast.fire({
        icon: "error",
        title: `Error: ${error}`,
      });
      console.error("Error:", error);
    });
});

document.getElementById("checkoutForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());
  
  let Toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  try {
    const response = await fetch('checkout/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.success) {
      await Toast.fire({
        icon: "success",
        title: result.message,
      })
      window.location.href = `/checkout/payment/${result.orderId}`;
    } else {
      Toast.fire({
        icon: "error",
        title: result.message,
      })
    }
  } catch (error) {
    Toast.fire({
      icon: "success",
      title: `Error placing order: ${error}`,
    })
    console.error('Error placing order:', error);
  }
});