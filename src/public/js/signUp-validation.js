document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('signupForm');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous error messages
    clearErrors();

    // Get form values
    const firstName = document.getElementById('firstname').value.trim();
    const lastName = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    let isValid = true;

    if (!firstName) {
      setError('firstnameError', 'First name is required.');
      isValid = false;
    } else if (!lastName) {
      setError('lastnameError', 'Last name is required.');
      isValid = false;
    } else if (!validateEmail(email)) {
      setError('emailError', 'Please enter a valid email address.');
      isValid = false;
    } else if (password.length < 6) {
      setError('passwordError', 'Password must be at least 6 characters long.');
      isValid = false;
    }

    // If validation is successful, submit the form
    if (isValid) {
      form.submit();
    }
  });

  function validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  }

  function setError(id, message) {
    document.getElementById(id).textContent = message;
    document.getElementById(id).style.display = 'block';
  }

  function clearErrors() {
    document.getElementById('firstnameError').textContent = '';
    document.getElementById('firstnameError').style.display = 'none';
    document.getElementById('lastnameError').textContent = '';
    document.getElementById('lastnameError').style.display = 'none';
    document.getElementById('emailError').textContent = '';
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('passwordError').style.display = 'none';

  }
});
