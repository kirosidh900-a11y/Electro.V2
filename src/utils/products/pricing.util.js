const GST_RATE = 18;

// ─── Step 1: raw discount an offer gives on the selling price ────────────────
// No caps here — just the pure offer calculation
const rawOfferDiscount = (sellingPrice, offer) => {
  if (!offer) return 0;

  let discount = 0;

  if (offer.discount_type === "percentage") {
    discount = (sellingPrice * offer.discount) / 100;
    // offer-level cap (e.g. "max ₹500 off" on a percentage offer)
    if (offer.max_discount > 0) {
      discount = Math.min(discount, offer.max_discount);
    }
  } else if (offer.discount_type === "fixed") {
    discount = offer.discount;
  }

  // never exceed the selling price itself
  return Math.min(discount, sellingPrice);
};

// ─── Full pricing for one variant ────────────────────────────────────────────
// Exact logic:
//   1. Collect all applicable offers (all/product/category/brand already filtered
//      by getActiveOffers before this is called)
//   2. Pick the offer that gives the BIGGEST raw discount on variant.price
//   3. Apply variant.max_discount_amount cap:
//        if bestDiscount > max_discount_amount → use max_discount_amount
//        else → use bestDiscount as-is
//   4. finalPrice = (sellingPrice - cappedDiscount) + GST
//   5. savings shown = regular_price (MRP) - finalPrice
export const calculateBestPrice = (variant, offers = []) => {
  const sellingPrice = variant.price;                          // offer base
  const mrp          = variant.regular_price ?? sellingPrice;  // MRP (strikethrough)
  const maxCap       = variant.max_discount_amount ?? 0;       // variant-level cap

  // Step 1 & 2: find the offer with the biggest raw discount
  let bestRawDiscount = 0;
  let appliedOffer    = null;

  for (const offer of offers) {
    const d = rawOfferDiscount(sellingPrice, offer);
    if (d > bestRawDiscount) {
      bestRawDiscount = d;
      appliedOffer    = offer;
    }
  }

  // Step 3: apply max_discount_amount cap
  // if offer discount exceeds the cap → use cap, else use offer discount
  const finalDiscount =
    maxCap > 0
      ? Math.min(bestRawDiscount, maxCap)
      : bestRawDiscount;

  // Step 4: compute final price
  const discountedBase = Math.max(0, sellingPrice - finalDiscount);
  const gstAmount      = Math.round((discountedBase * GST_RATE) / 100);
  const finalPrice     = Math.round(discountedBase + gstAmount);

  // Step 5: total saving vs MRP
  const totalSavings = Math.max(0, mrp - finalPrice);

  return {
    basePrice:    Math.round(discountedBase), // post-discount, pre-GST
    gstAmount,
    finalPrice,                               // what user pays (incl. GST)
    gstRate:      GST_RATE,
    appliedOffer,
    savings:      totalSavings,               // vs MRP
    offerSavings: Math.round(finalDiscount),  // actual offer portion applied
  };
};

// ─── Apply pricing to every variant of a product ─────────────────────────────
export const applyPricingToProduct = (product, offers = []) => {
  if (!product?.variants?.length) return product;

  const variants = product.variants
    .map((variant) => {
      const pricing = calculateBestPrice(variant, offers);
      return {
        ...variant,
        regular_price: variant.regular_price ?? variant.price,
        ...pricing,
      };
    })
    .sort((a, b) => a.finalPrice - b.finalPrice);

  return { ...product, variants };
};

// ─── Helpers (backward compat) ────────────────────────────────────────────────
export const getBestOffer = (sellingPrice, offers = [], variant = null) => {
  if (!offers.length) return null;
  let best = null, max = 0;
  for (const o of offers) {
    const d = rawOfferDiscount(sellingPrice, o);
    if (d > max) { max = d; best = o; }
  }
  return best;
};

export const getBestVariantPricing = (variant, offers = []) =>
  calculateBestPrice(variant, offers);

export const applyDiscount = ({ price, offer }) => {
  if (!offer) return price;
  return Math.max(0, price - rawOfferDiscount(price, offer));
};

export const applyPricing = (product, offer) => {
  if (!offer) return product;
  product.offer = offer;
  product.variants = product.variants.map((v) => ({
    ...v,
    finalPrice: Math.max(0, Math.round(v.price - rawOfferDiscount(v.price, offer))),
  }));
  return product;
};
