import Address from "../../models/addressSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import Order from "../../models/orderSchema.model.js";

import { applyPricingToProduct } from "../../utils/products/pricing.util.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";

import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import mongoose from "mongoose";
import orderItem from "../../models/orderItemSchema.model.js";

const generateOrderNumber = async () => {
  let isUnique = false;
  let orderNumber;

  while (!isUnique) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);

    orderNumber = `ORD-${datePart}-${randomPart}`;

    const exists = await Order.findOne({ orderNumber });

    if (!exists) isUnique = true;
  }

  return orderNumber;
};

export const placeOrderService = async ({
  userId,
  addressId,
  paymentMethod,
}) => {
  try {
    if (paymentMethod !== "cod") {
      throw new AppError(
        "Only Cash on Delivery is available currently",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // 🛒 GET CART
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      throw new AppError("Cart is empty", HTTP_STATUS.BAD_REQUEST);
    }

    // 📍 GET ADDRESS
    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      throw new AppError("Invalid address", HTTP_STATUS.NOT_FOUND);
    }

    // 🎯 GET OFFERS
    const allOffers = await getActiveOffers();

    let orderItems = [];
    let subtotal = 0;
    let gstTotal = 0;

    // ✅ GENERATE ONCE
    const orderNumber = await generateOrderNumber();

    // ================= LOOP ITEMS =================
    for (const item of cart.items) {
      const product = item.productId;

      if (!product) {
        throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
      }

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
        throw new AppError("Pricing error", HTTP_STATUS.BAD_REQUEST);
      }

      const qty = item.quantity;

      const basePrice = pricedVariant.basePrice;
      const gstAmount = pricedVariant.gstAmount;
      const finalPrice = pricedVariant.finalPrice;

      const itemSubtotal = basePrice * qty;
      const itemGST = gstAmount * qty;
      const itemFinal = finalPrice * qty;

      subtotal += itemSubtotal;
      gstTotal += itemGST;

      // 🔥 STOCK UPDATE (atomic)
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

      // 📦 PREPARE ORDER ITEM
      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        userId,

        name: product.name,
        brand: product.brand?.title,

        attributes: variant.attributes || {},
        images: variant.product_images?.map((img) => img.url) || [],

        orderNumber, // optional (same for all items)

        quantity: qty,

        pricing: {
          regularPrice: variant.regular_price || variant.price,
          basePrice,
          gstRate: pricedVariant.gstRate || 18,
          gstAmount,
          finalPrice,
          total: itemFinal,
          discountAmount: (variant.regular_price || variant.price) - basePrice,
        },

        itemStatus: "placed",
      });
    }

    // ================= FINAL CALC =================
    const couponDiscount = cart.couponDiscountAmount || 0;
    const deliveryCharge = subtotal > 500 ? 0 : 40;

    const finalAmount = subtotal - couponDiscount + deliveryCharge + gstTotal;

    // 📅 DELIVERY DATE
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 5);

    // ================= CREATE ORDER =================
    const order = await Order.create({
      userId,
      orderNumber, // ✅ CORRECT PLACE

      pricing: {
        subtotal,
        couponDiscount,
        deliveryCharge,
        gstTotal,
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

      delivery: {
        expectedDate,
      },
    });

    // ================= CREATE ORDER ITEMS =================
    await orderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        orderId: order._id,
      })),
    );

    // 🧹 CLEAR CART
    cart.items = [];
    cart.couponDiscountAmount = 0;
    await cart.save();

    return {
      success: true,
      orderId: order._id,
      orderNumber,
      redirectUrl: `/order/success/${order._id}`,
    };
  } catch (err) {
    console.error("Order Service Error:", err);
    throw err;
  }
};

export const getOrderSuccessService = async ({ userId, orderId }) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  }).lean();

  if (!order) {
    throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  return order;
};

export const getOrderListService = async ({ userId, page, limit, search }) => {
  const skip = (page - 1) * limit;

  // BASE FILTER
  let orderFilter = { userId };

  // SEARCH HANDLING
  let orderIds = [];

  if (search && search.trim() !== "") {
    // search in orders
    const orders = await Order.find({
      userId,
      orderNumber: { $regex: search, $options: "i" },
    }).select("_id");

    const orderIdsFromOrder = orders.map((o) => o._id);

    // search in items
    const items = await orderItem
      .find({
        userId,
        name: { $regex: search, $options: "i" },
      })
      .select("orderId");

    const orderIdsFromItems = items.map((i) => i.orderId);

    // merge
    orderIds = [...new Set([...orderIdsFromOrder, ...orderIdsFromItems])];

    orderFilter._id = { $in: orderIds };
  }

  // GET ORDERS
  const orders = await Order.find(orderFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const orderIdsList = orders.map((o) => o._id);

  // GET ITEMS SEPARATELY
  const items = await orderItem
    .find({
      orderId: { $in: orderIdsList },
    })
    .lean();

  // MERGE (IMPORTANT)
  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: items.filter((item) => String(item.orderId) === String(order._id)),
  }));

  const total = await Order.countDocuments(orderFilter);

  return {
    orders: ordersWithItems,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getOrderDetailsService = async ({ userId, orderId }) => {
  // 🔥 FIND ORDER (SECURE: user-specific)
  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    userId,
  }).lean();

  console.log("Seveices:", order);

  if (!order) {
    throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  return order;
};
