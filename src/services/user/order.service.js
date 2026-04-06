import Address from "../../models/addressSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import Order from "../../models/orderSchema.model.js";

import { applyPricingToProduct } from "../../utils/products/pricing.util.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";

import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
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

  let matchedItems = [];

  //SEARCH ITEMS DIRECTLY
  if (search && search.trim() !== "") {
    matchedItems = await orderItem
      .find({
        userId,
        name: { $regex: search, $options: "i" },
      })
      .lean();
  } else {
    matchedItems = await orderItem.find({ userId }).lean();
  }

  //PAGINATION ON ITEMS
  const paginatedItems = matchedItems
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(skip, skip + limit);

  const orderIds = [...new Set(paginatedItems.map((i) => i.orderId))];

  // GET RELATED ORDERS
  const orders = await Order.find({
    _id: { $in: orderIds },
  }).lean();

  //  MERGE ONLY MATCHED ITEMS
  const finalOrders = paginatedItems.map((item) => {
    const order = orders.find((o) => String(o._id) === String(item.orderId));

    return {
      ...order,
      items: [item],
    };
  });

  return {
    orders: finalOrders,
    total: matchedItems.length,
    totalPages: Math.ceil(matchedItems.length / limit),
  };
};

export const getOrderDetailsService = async ({ userId, orderItemId }) => {
  // ✅ GET SINGLE ORDER ITEM (NO POPULATE)
  const item = await orderItem
    .findOne({
      _id: orderItemId,
      userId,
    })
    .lean();

  if (!item) {
    throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);
  }

  // ✅ GET ORDER (only for extra details)
  const order = await Order.findById(item.orderId).lean();

  if (!order) {
    throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  // ✅ RETURN CLEAN RESPONSE
  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    pricing: item.pricing,

    product: {
      name: item.name,
      attributes: item.attributes,
      images: item.images,
      quantity: item.quantity,
      pricing: item.pricing,
      itemStatus: item.itemStatus,
      createdAt: item.createdAt,
    },

    shippingAddress: order.shippingAddress,
    payment: order.payment,
    orderStatus: order.orderStatus,
    delivery: order.delivery,
    isCancelled: order.isCancelled,
    cancelReason: order.cancelReason,
    cancelComments: order.cancelComments,
    updatedAt: order.updatedAt,
    cancelledAt: order.cancelledAt,
  };
};

export const cancelOrderService = async ({
  userId,
  orderId,
  reason,
  comments,
}) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) {
    throw new Error("Order not found");
  }

  const status = order.orderStatus.toLowerCase();

  if (status === "delivered") {
    throw new Error("Delivered orders cannot be cancelled");
  }

  if (order.isCancelled) {
    throw new Error("Order already cancelled");
  }

  // GET ITEMS
  const items = await orderItem.find({ orderId });

  for (const item of items) {
    let updatedVariant = null;

    // STOCK ROLLBACK
    if (item.variantId) {
      const product = await Products.findOneAndUpdate(
        {
          _id: item.productId,
          "variants._id": item.variantId,
        },
        {
          $inc: {
            "variants.$.stock": item.quantity,
          },
        },
        { new: true },
      );

      updatedVariant = product.variants.find(
        (v) => v._id.toString() === item.variantId.toString(),
      );
    } else {
      await Products.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } },
      );
    }

    // 🔥 3. UPDATE ITEM STATUS
    item.itemStatus = "cancelled";
    await item.save();

    // SOCKET EMIT (REAL-TIME UPDATE)
    if (global.io && updatedVariant) {
      global.io.emit("stockUpdated", {
        productId: item.productId,
        variantId: item.variantId,
        stock: updatedVariant.stock,
      });
    }
  }

  //UPDATE ORDER
  order.orderStatus = "cancelled";
  order.isCancelled = true;
  order.cancelReason = reason;
  order.cancelComments = comments;
  order.cancelledAt = new Date();

  await order.save();

  return order;
};

export const returnOrderItemService = async ({ userId, orderItemId, returnReason, returnComments }) => {
  const item = await orderItem.findOne({ _id: orderItemId, userId });

  if (!item) throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);

  if (item.itemStatus !== "delivered") {
    throw new AppError("Only delivered items can be returned", HTTP_STATUS.BAD_REQUEST);
  }

  item.itemStatus = "returned";
  item.returnReason = returnReason + (returnComments ? ` — ${returnComments}` : "");
  await item.save();

  return item;
};
