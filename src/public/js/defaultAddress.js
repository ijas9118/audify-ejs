document.addEventListener('DOMContentLoaded', () => {
  const addressCards = document.querySelectorAll('.address-card-modern');

  addressCards.forEach((card) => {
    card.addEventListener('click', async () => {
      // Check if we are on the account page (not checkout)
      if (window.location.pathname.includes('/account/addresses')) {
        const addressId = card.getAttribute('data-id');

        try {
          const response = await fetch('/account/addresses/default', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ newDefaultId: addressId }),
          });

          if (response.ok) {
            window.location.reload();
          } else {
            console.error('Failed to update default address');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });
  });
});
