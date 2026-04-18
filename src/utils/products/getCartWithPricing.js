import cartSchemaModels from "../../models/cartSchema.models.js";
import { getActiveOffers } from "./offers.util.js";
import { applyPricingToProduct } from "./pricing.util.js";

export const getCartWithPricing = async (userId) => {
  let cart = await cartSchemaModels
    .findOne({ userId })
    .populate({
      path: "items.productId",
      select: "name brand category variants",
      populate: [
        { path: "brand", select: "_id name" },
        { path: "category", select: "_id title" },
      ],
    })
    .lean();

  if (!cart) {
    return { items: [] };
  }

  // ================= OFFERS MAP =================
  const products = cart.items.map((i) => i.productId);
  const offersMap = new Map();

  for (const product of products) {
    const offers = await getActiveOffers(product);
    offersMap.set(product._id.toString(), offers);
  }

  // ================= APPLY PRICING =================
  const updatedItems = await Promise.all(
    cart.items.map(async (item) => {
      const product = item.productId;
      if (!product) return null;

      const offers = offersMap.get(product._id.toString());

      const productWithPricing = applyPricingToProduct(product, offers);

      const variant = productWithPricing.variants.find(
        (v) => v._id.toString() === item.variantId.toString(),
      );

      if (!variant) return null;

      return {
        ...item,
        productId: {
          _id: product._id,
          name: product.name,
          brand: product.brand,
        },
        variantId: {
          ...variant,
          images: variant.product_images?.map((img) => img.url) || [],
        },
      };
    }),
  );

  return {
    ...cart,
    items: updatedItems.filter(Boolean),
  };
};
