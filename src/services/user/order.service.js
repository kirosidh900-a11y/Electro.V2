import Address from "../../models/addressSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import Order from "../../models/orderSchema.model.js";

import { applyPricingToProduct } from "../../utils/products/pricing.util.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";

import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const placeOrderService = async ({
  userId,
  addressId,
  paymentMethod,
}) => {
  try {
    // 🔥 COD ONLY CHECK
    if (paymentMethod !== "cod") {
      throw new AppError(
        "Only Cash on Delivery is available currently",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // 🔥 GET CART
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      throw new AppError("Cart is empty", HTTP_STATUS.BAD_REQUEST);
    }

    // 🔥 GET ADDRESS
    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      throw new AppError("Invalid address", HTTP_STATUS.NOT_FOUND);
    }

    // 🔥 GET ALL OFFERS ONCE
    const allOffers = await getActiveOffers();

    let orderItems = [];
    let subtotal = 0;

    // 🔥 LOOP ITEMS
    for (const item of cart.items) {
      const product = item.productId;

      if (!product) {
        throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
      }

      // ✅ FIND INDEX (BEST APPROACH)
      const index = product.variants.findIndex(
        (v) => String(v._id) === String(item.variantId),
      );

      if (index === -1) {
        throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
      }

      const variant = product.variants[index];

      // 🔥 APPLY PRICING
      const pricedProduct = applyPricingToProduct(product, allOffers);
      const pricedVariant = pricedProduct.variants[index];

      if (!pricedVariant) {
        throw new AppError(
          "Pricing error for variant",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const price = pricedVariant.finalPrice;
      const qty = item.quantity;

      const itemTotal = price * qty;
      subtotal += itemTotal;

      // 🔥 ATOMIC STOCK UPDATE
      const update = await Products.updateOne(
        {
          _id: product._id,
          "variants._id": variant._id,
          "variants.stock": { $gte: qty },
        },
        {
          $inc: { "variants.$.stock": -qty },
        },
      );

      if (update.modifiedCount === 0) {
        throw new AppError(
          "Stock changed during checkout",
          HTTP_STATUS.CONFLICT,
        );
      }

      // 🔥 ORDER ITEM SNAPSHOT
      orderItems.push({
        productId: product._id,
        variantId: variant._id,

        name: product.name,
        brand: product.brand?.title,

        attributes: Object.fromEntries(variant.attributes || {}),
        images: variant.product_images?.map((img) => img.url) || [],

        quantity: qty,

        pricing: {
          regularPrice: variant.regular_price,
          finalPrice: price,
          discountAmount: variant.regular_price - price,
          total: itemTotal,
        },
      });
    }

    // 🔥 PRICING SUMMARY
    const couponDiscount = cart.couponDiscountAmount || 0;
    const deliveryCharge = subtotal > 500 ? 0 : 40;
    const finalAmount = subtotal - couponDiscount + deliveryCharge;

    // 🔥 CREATE ORDER
    const order = await Order.create({
      userId,

      items: orderItems,

      pricing: {
        subtotal,
        couponDiscount,
        deliveryCharge,
        finalAmount,
      },

      shippingAddress: {
        name: address.name,
        phone: address.phone,
        altPhone: address.altPhone,
        address: address.address,
        locality: address.locality,
        landmark: address.landmark,
        city: address.city,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        addressType: address.addressType,
      },

      payment: {
        method: "cod",
        status: "pending",
      },

      orderStatus: "placed",
    });

    // 🔥 CLEAR CART
    cart.items = [];
    cart.couponDiscountAmount = 0;
    await cart.save();

    return {
      success: true,
      orderId: order._id,
      redirectUrl: `/order/success/${order._id}`,
    };
  } catch (err) {
    console.error("Order Service Error:", err);
    throw err;
  }
};
