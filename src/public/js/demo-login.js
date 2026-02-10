document.addEventListener('DOMContentLoaded', () => {
  const demoLoginButton = document.getElementById('demoLoginButton');

  if (demoLoginButton) {
    demoLoginButton.addEventListener('click', async () => {
      // Show loading state
      const originalText = demoLoginButton.innerHTML;
      demoLoginButton.disabled = true;
      demoLoginButton.innerHTML =
        '<i class="bi bi-hourglass-split"></i> Logging in...';

      try {
        const response = await fetch('/login/demo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Show success toast if Swal is available
          if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });

            Toast.fire({
              icon: 'success',
              title: 'Welcome to the demo!',
            });
          }

          // Redirect to home page
          setTimeout(() => {
            window.location.href = result.redirectUrl || '/';
          }, 500);
        } else {
          // Restore button state
          demoLoginButton.disabled = false;
          demoLoginButton.innerHTML = originalText;

          // Show error toast if Swal is available
          if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
            });

            Toast.fire({
              icon: 'error',
              title: result.message || 'Demo login failed. Please try again.',
            });
          } else {
            alert(result.message || 'Demo login failed. Please try again.');
          }
        }
      } catch (error) {
        // Restore button state
        demoLoginButton.disabled = false;
        demoLoginButton.innerHTML = originalText;

        // Show error
        if (typeof Swal !== 'undefined') {
          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });

          Toast.fire({
            icon: 'error',
            title: 'An error occurred. Please try again.',
          });
        } else {
          alert('An error occurred. Please try again.');
        }
        console.error('Demo login error:', error);
      }
    });
  }
});
