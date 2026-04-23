import addressSchemaModel from "../../models/addressSchema.model.js";
import { getCartWithPricing } from "../../utils/products/getCartWithPricing.js";
import { getOrCreateWallet } from "./wallet.service.js";
import { validateCartStockServiceCheck } from "../product/cart.service.js";
import Products from "../../models/productSchema.model.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";
import { applyPricingToProduct } from "../../utils/products/pricing.util.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import redisClient from "../../utils/partials/redisClient.util.js";

const BUY_NOW_TTL = 15 * 60; // 15 minutes in seconds

// ── Helpers ───────────────────────────────────────────────────────────────────
export const setBuyNowSession = async (userId, data) => {
  await redisClient.set(
    `buynow:${userId}`,
    JSON.stringify(data),
    { EX: BUY_NOW_TTL },
  );
};

export const getBuyNowSession = async (userId) => {
  const raw = await redisClient.get(`buynow:${userId}`);
  return raw ? JSON.parse(raw) : null;
};

export const clearBuyNowSession = async (userId) => {
  await redisClient.del(`buynow:${userId}`);
};

// ── Regular cart checkout ─────────────────────────────────────────────────────
export const getCheckoutDataService = async (userId) => {
  const stockResult = await validateCartStockServiceCheck(userId);

  if (!stockResult.success) {
    return { valid: false };
  }

  const [cart, wallet, addresses] = await Promise.all([
    getCartWithPricing(userId),
    getOrCreateWallet(userId),
    addressSchemaModel.find({ userId }).lean(),
  ]);

  cart.walletBalance = wallet.balance;

  return { valid: true, cart, addresses };
};

// ── Buy Now checkout ──────────────────────────────────────────────────────────
export const getBuyNowCheckoutData = async (userId, { productId, variantId, quantity }) => {
  const qty = Math.max(1, parseInt(quantity) || 1);

  const [product, wallet, addresses] = await Promise.all([
    Products.findById(productId)
      .populate("brand", "_id title logo")
      .populate("category", "_id title")
      .lean(),
    getOrCreateWallet(userId),
    addressSchemaModel.find({ userId }).lean(),
  ]);

  if (!product) throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);

  const offers       = await getActiveOffers(product);
  const pricedProduct = applyPricingToProduct(product, offers);

  const variant = pricedProduct.variants.find(
    (v) => v._id.toString() === variantId,
  );
  if (!variant) throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);

  const availableStock = Math.max((variant.stock || 0) - (variant.reserved || 0), 0);
  if (availableStock <= 0) {
    throw new AppError(`${product.name} is out of stock`, HTTP_STATUS.BAD_REQUEST);
  }
  if (qty > availableStock) {
    throw new AppError(`Only ${availableStock} item(s) available`, HTTP_STATUS.BAD_REQUEST);
  }

  // Build a cart-shaped object — same structure checkout.ejs expects
  const cart = {
    isBuyNow: true,
    items: [
      {
        _id:       `buynow_${productId}_${variantId}`,
        productId: {
          _id:   product._id,
          name:  product.name,
          brand: product.brand,
        },
        variantId: {
          ...variant,
          images: variant.product_images?.map((img) => img.url) || [],
        },
        quantity: qty,
      },
    ],
    couponDiscountAmount: 0,
    appliedCoupon: { code: null, couponId: null, discountAmount: 0 },
    walletBalance: wallet.balance,
  };

  return { valid: true, cart, addresses };
};
