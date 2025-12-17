let countdownTime = 15; // Countdown timer in seconds
const countdownElement = document.getElementById('countdown');
const resendButton = document.getElementById('resend-btn');
const resendMessage = document.getElementById('resend-msg');

const startCountdown = () => {
  const countdownInterval = setInterval(() => {
    countdownTime--;

    countdownElement.innerHTML = countdownTime;

    if (countdownTime <= 0) {
      clearInterval(countdownInterval);

      resendButton.style.display = 'inline';
      resendMessage.style.display = 'none';
    }
  }, 1000);
};

window.onload = startCountdown;

function resendOtp() {
  event.preventDefault(); 

  resendButton.style.display = 'none';
  countdownTime = 15;
  countdownElement.innerHTML = countdownTime;
  resendMessage.style.display = 'block';

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

  fetch('/signup/resend-otp', {
    method: 'GET',
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      Toast.fire({
        icon: "success",
        title: `${data.message}`,
      });
    } else if (data.error) {
      Toast.fire({
        icon: "error",
        title: `${data.message}`,
      });
    }
    startCountdown();
  })
  .catch(error => {
    console.error('Error:', error);
    Toast.fire({
      icon: "error",
      title: 'Error sending OTP. Please try again.',
    });
  });
}
