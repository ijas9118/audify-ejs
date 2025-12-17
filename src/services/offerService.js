const applyOffer = (price, offer) => {
  if (!offer) return price;

  // Check if the offer is within the valid date range
  const now = new Date();
  if (now < offer.validFrom || now > offer.validUntil || offer.status !== 'active') {
    return price; // No discount if offer is not valid
  }

  let discountAmount = 0;

  if (offer.discountType === 'percentage') {
    discountAmount = (price * offer.discountValue / 100);
  } else if (offer.discountType === 'fixed') {
    discountAmount = offer.discountValue;
  }

  // Apply maximum discount if specified
  if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
    discountAmount = offer.maxDiscountAmount;
  }

  return price - discountAmount;
};

const calculateDiscountedPrice = (productPrice, productOffer, categoryOffer) => {
  const productDiscountedPrice = applyOffer(productPrice, productOffer);
  const categoryDiscountedPrice = applyOffer(productPrice, categoryOffer);

  // Return the best price
  return Math.min(productDiscountedPrice, categoryDiscountedPrice);
};

module.exports = {
  calculateDiscountedPrice,
};
