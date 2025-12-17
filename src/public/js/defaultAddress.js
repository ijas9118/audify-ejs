document.addEventListener('DOMContentLoaded', () => {
  const addressCards = document.querySelectorAll('.address-card');
  
  addressCards.forEach(card => {
    card.addEventListener('click', async () => {
      const addressId = card.getAttribute('data-id');
      
      try {
        const response = await fetch('/account/addresses/default', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ newDefaultId: addressId })
        });

        if (response.ok) {
          window.location.reload();
        } else {
          console.error('Failed to update default address');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
  });
});
