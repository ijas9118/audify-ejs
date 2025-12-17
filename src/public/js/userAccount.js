document.getElementById('userForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = this.dataset.id;
  const formData = new FormData(this);

  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  try {
    const response = await fetch(`/account/${userId}`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      Toast.fire({
        icon: 'success',
        title: result.message || 'Your account has been updated!'
      });
    } else {
      Toast.fire({
        icon: 'error',
        title: result.message || 'Something went wrong!'
      });
    }
  } catch (error) {
    Toast.fire({
      icon: 'error',
      title: 'There was an error updating your account. Please try again later.'
    });
  }
});

document.getElementById('updatePasswordForm').addEventListener('submit', async function (e) {
  e.preventDefault();

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

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    alert("New password and confirmation password don't match.");
    return;
  }

  try {
    const response = await fetch('/account/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      Toast.fire({
        icon: "success",
        title: result.message,
      });
      document.getElementById('updatePasswordForm').reset();

      const modalElement = document.getElementById('updatePasswordModal');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    } else {
      Toast.fire({
        icon: "error",
        title: result.error || 'Password update failed',
      });
    }
  } catch (err) {
    console.error('Error updating password:', err);
    Toast.fire({
      icon: "error",
      title: 'Something went wrong. Please try again.',
    });
  }
});

document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', function() {
    const targetInput = document.querySelector(this.getAttribute('data-target'));
    const icon = this.querySelector('i');

    if (targetInput.type === 'password') {
      targetInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      targetInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});
