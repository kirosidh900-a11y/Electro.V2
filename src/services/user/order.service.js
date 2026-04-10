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
    if (!["cod", "razorpay"].includes(paymentMethod)) {
      throw new AppError("Invalid payment method", HTTP_STATUS.BAD_REQUEST);
    }

    console.log(
      "Placing order for user:",
      userId,
      "with address:",
      addressId,
      "and payment method:",
      paymentMethod,
    );

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

      let update;

      if (paymentMethod === "cod") {
        update = await Products.updateOne(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id: variant._id,
                stock: { $gte: qty },
              },
            },
          },
          {
            $inc: { "variants.$.stock": -qty },
          },
        );

        // 🔥 GET UPDATED VALUE
        const updatedProduct = await Products.findById(product._id);
        const updatedVariant = updatedProduct.variants.id(variant._id);

        const availableStock =
          updatedVariant.stock - (updatedVariant.reserved || 0);

        // 🔥 SOCKET (FINAL STOCK ONLY)
        if (global.io) {
          global.io.emit("stockUpdated", {
            productId: product._id,
            variantId: variant._id,
            stock: Math.max(availableStock, 0),
          });
        }
      } else if (paymentMethod === "razorpay") {
        update = await Products.updateOne(
          {
            _id: product._id,
            "variants._id": variant._id,
          },
          {
            $inc: { "variants.$.reserved": qty },
          },
        );

        // 🔥 GET UPDATED VALUE
        const updatedProduct = await Products.findById(product._id);
        const updatedVariant = updatedProduct.variants.id(variant._id);

        const availableStock =
          updatedVariant.stock - (updatedVariant.reserved || 0);

        // 🔥 SOCKET (IMPORTANT)
        if (global.io) {
          global.io.emit("stockUpdated", {
            productId: product._id,
            variantId: variant._id,
            stock: Math.max(availableStock, 0),
          });
        }
      }

      // ❗ COMMON CHECK
      if (update.modifiedCount === 0) {
        throw new AppError("Stock not available", HTTP_STATUS.CONFLICT);
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
    expectedDate.setDate(expectedDate.getDate() + 7);

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
        method: paymentMethod,
        status: paymentMethod === "cod" ? "pending" : "pending",
      },

      orderStatus: paymentMethod === "cod" ? "placed" : "pending_payment",

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
      order, 
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

export const getOrderListService = async ({
  userId,
  page = 1,
  limit = 5,
  search,
}) => {
  const skip = (page - 1) * limit;

  let orderIdsFromItems = [];

  // SEARCH IN ORDER ITEMS (PRODUCT NAME)
  if (search && search.trim() !== "") {
    const normalizedSearch = search.trim();

    const matchedItems = await orderItem
      .find({
        userId,
        name: { $regex: normalizedSearch, $options: "i" },
      })
      .select("orderId");

    orderIdsFromItems = matchedItems.map((i) => i.orderId);
  }

  // BUILD ORDER QUERY
  const query = { userId };

  if (search && search.trim() !== "") {
    const normalizedSearch = search.trim();

    query.$or = [
      { orderNumber: { $regex: normalizedSearch, $options: "i" } },
      { _id: { $in: orderIdsFromItems } }, //MATCH FROM ITEMS
    ];
  }

  // GET ORDERS
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // GET ITEMS
  const orderIds = orders.map((o) => o._id);

  const orderItems = await orderItem
    .find({
      orderId: { $in: orderIds },
    })
    .lean();

  // GROUP ITEMS
  const itemsMap = {};
  orderItems.forEach((item) => {
    const key = String(item.orderId);
    if (!itemsMap[key]) itemsMap[key] = [];
    itemsMap[key].push(item);
  });

  //FINAL FORMAT
  const formattedOrders = orders.map((order) => {
    const items = itemsMap[String(order._id)] || [];

    return {
      ...order,
      items,
      itemCount: items.length,
      previewImages: items
        .slice(0, 5)
        .map((i) => i.images?.[0])
        .filter(Boolean),
    };
  });

  return {
    orders: formattedOrders,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getOrderDetailsService = async ({ userId, orderId }) => {
  const order = await Order.findOne({ _id: orderId, userId }).lean();

  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  const items = await orderItem.find({ orderId: order._id }).lean();

  return { order, items };
};

export const cancelOrderService = async ({
  userId,
  orderId,
  itemId,
  reason,
  comments,
}) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) {
    throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  }

  if (order.orderStatus.toLowerCase() === "delivered") {
    throw new AppError("Delivered orders cannot be cancelled");
  }

  const rollbackStock = async (item) => {
    if (item.variantId) {
      await Products.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } },
      );
    } else {
      await Products.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } },
      );
    }
  };

  const recalculateOrder = async () => {
    const activeItems = await orderItem.find({
      orderId,
      userId,
      itemStatus: { $ne: "cancelled" },
    });

    let subtotal = 0;
    let gstTotal = 0;

    activeItems.forEach((i) => {
      subtotal += i.pricing.total;
      gstTotal += i.pricing.gstAmount || 0;
    });

    // ✅NORMAL CASE
    if (activeItems.length > 0) {
      order.pricing.subtotal = subtotal;
      order.pricing.gstTotal = gstTotal;
      order.pricing.finalAmount = subtotal + gstTotal;
    }

    // FULL CANCEL CASE (IMPORTANT)
    if (activeItems.length === 0) {
      order.pricing.subtotal = 0;
      order.pricing.gstTotal = 0;
      order.pricing.finalAmount = 0;

      order.orderStatus = "cancelled";
      order.isCancelled = true;
      order.cancelReason = reason;
      order.cancelComments = comments;
      order.cancelledAt = new Date();
    }

    return activeItems.length;
  };

  // =============================
  // 🔥 ITEM CANCEL
  // =============================
  if (itemId) {
    const item = await orderItem.findOne({ _id: itemId, orderId, userId });

    if (!item) throw new AppError("Item not found");

    if (!["placed", "confirmed"].includes(item.itemStatus)) {
      throw new AppError("Item cannot be cancelled");
    }

    // ✅ STEP 1: Update item
    item.itemStatus = "cancelled";
    item.cancel = {
      reason,
      comments,
      requestedAt: new Date(),
      cancelledAt: new Date(),
    };
    await item.save();

    // ✅ STEP 2: Recalculate order
    const remaining = await recalculateOrder();
    await order.save();

    // ✅ STEP 3: Rollback stock (LAST)
    await rollbackStock(item);

    return {
      message:
        remaining === 0
          ? "Order fully cancelled"
          : "Item cancelled & recalculated",
    };
  }

  // =============================
  // 🔥 FULL ORDER CANCEL
  // =============================
  const items = await orderItem.find({ orderId, userId });

  let cancelledCount = 0;

  for (const item of items) {
    if (!["placed", "confirmed"].includes(item.itemStatus)) continue;

    // ✅ update first
    item.itemStatus = "cancelled";
    item.cancel = {
      reason,
      comments,
      requestedAt: new Date(),
      cancelledAt: new Date(),
    };

    await item.save();

    // ✅ stock last
    await rollbackStock(item);

    cancelledCount++;
  }

  if (cancelledCount === 0) {
    throw new AppError("No items eligible");
  }

  await recalculateOrder();
  await order.save();

  return {
    message: `${cancelledCount} item(s) cancelled successfully`,
  };
};

export const returnOrderItemService = async ({
  userId,
  orderItemId,
  returnReason,
  returnComments,
}) => {
  const item = await orderItem.findOne({ _id: orderItemId, userId });

  if (!item) {
    throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);
  }

  if (item.itemStatus !== "delivered") {
    throw new AppError(
      "Only delivered items can be returned",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // prevent duplicate request
  if (item.return?.requestedAt) {
    throw new AppError("Return already requested");
  }

  // USER ONLY REQUESTS
  item.itemStatus = "return_requested";

  item.return = {
    reason: returnReason,
    comments: returnComments,
    requestedAt: new Date(),
  };

  await item.save();

  return item;
};
