document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end", // Adjust position as needed
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    let isValid = true;

    if (!validateEmail(email)) {
      Toast.fire({
        icon: "error",
        title: "Please enter a valid email address.",
      });
      isValid = false;
    } else if (password.length < 6) {
      Toast.fire({
        icon: "error",
        title: "Password must be at least 6 characters long.",
      });
      isValid = false;
    }

    if (isValid) {
      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
          window.location.href = result.redirectUrl || "/";
        } else {
          Toast.fire({
            icon: "error",
            title: result.message || "Login Failed. Please try again.",
          });
        }
      } catch (error) {
        Toast.fire({
          icon: "error",
          title: "An error occurred. Please try again.",
        });
      }
    }
  });

  function validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  }
});
