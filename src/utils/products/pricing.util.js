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

const calculateFinalPrice = (variant, offer) => {
  if (!offer) return variant.price;

  let discount = 0;

  // 🔹 STEP 1: FULL OFFER CALCULATION
  if (offer.discount_type === "percentage") {
    discount = (variant.price * offer.discount) / 100;
  } else {
    discount = offer.discount;
  }

  // 🔹 STEP 2: APPLY CAPS (IMPORTANT)
  const caps = [
    discount,
    offer.max_discount ?? discount,
    variant.max_discount_amount ?? discount,
  ];

  const finalDiscount = Math.min(...caps);

  // 🔹 STEP 3: FINAL PRICE
  return Math.max(0, variant.price - finalDiscount);
};

export const getBestVariantPricing = (variant, offers) => {
  let bestPrice = variant.price;
  let bestOffer = null;

  for (const offer of offers) {
    const finalPrice = calculateFinalPrice(variant, offer);

    if (finalPrice < bestPrice) {
      bestPrice = finalPrice;
      bestOffer = offer;
    }
  }

  return {
    finalPrice: Math.round(bestPrice),
    appliedOffer: bestOffer,
    savings: Math.round(variant.price - bestPrice),
  };
};
