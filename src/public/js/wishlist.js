async function addToWishList(productId) {
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
    const response = await fetch(`/shop/wishlist/add/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (response.ok) {
      Toast.fire({
        icon: "success",
        title: 'Product added to wishlist!',
      });
    } else {
      alert(data.message || 'Failed to add product to wishlist');
      Toast.fire({
        icon: "error",
        title: data.message || 'Failed to add product to wishlist',
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

async function addToCartFromWishlist(productId) {
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
    const response = await fetch(`/shop/cart/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (response.ok) {
      await Toast.fire({
        icon: "success",
        title: 'Product added to cart!',
      });
      removeProduct(productId);
    } else {
      Toast.fire({
        icon: "error",
        title: data.message || 'Failed to add product to cart',
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

async function removeProduct(productId) {
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
    const response = await fetch(`/shop/wishlist/remove/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (response.ok) {
      window.location.reload();
    } else {
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