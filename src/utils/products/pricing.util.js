export const applyDiscount = ({ price, offer }) => {
  if (!offer) return price;

  let finalPrice = price;

  if (offer.discount_type === "percentage") {
    const discountAmount = (price * offer.discount) / 100;

    finalPrice =
      price - Math.min(discountAmount, offer.max_discount || discountAmount);
  } else if (offer.discount_type === "flat") {
    finalPrice = price - offer.discount;
  }

  return Math.max(finalPrice, 0); // prevent negative
};

export const getBestOffer = (product, offers) => {
  if (!offers.length) return null;

  let best = null;
  let maxDiscount = 0;

  for (const offer of offers) {
    let discountValue = 0;

    if (offer.discount_type === "percentage") {
      discountValue = offer.discount;
    } else {
      discountValue = offer.discount; // flat
    }

    if (discountValue > maxDiscount) {
      maxDiscount = discountValue;
      best = offer;
    }
  }

  return best;
};

export const applyPricing = (product, offer) => {
  if (!offer) return product;

  product.offer = offer;

  product.variants = product.variants.map((v) => {
    let finalPrice = v.price;

    if (offer.discount_type === "percentage") {
      finalPrice = v.price - (v.price * offer.discount) / 100;
    } else {
      finalPrice = v.price - offer.discount;
    }

    if (offer.max_discount) {
      const discountAmount = v.price - finalPrice;
      if (discountAmount > offer.max_discount) {
        finalPrice = v.price - offer.max_discount;
      }
    }

    return {
      ...v,
      finalPrice: Math.max(0, Math.round(finalPrice)),
    };
  });

  return product;
};
