import Address from "../../models/addressSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import Order from "../../models/orderSchema.model.js";

import { applyPricingToProduct, calculateBestPrice } from "../../utils/products/pricing.util.js";
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
  buyNow = null,   // { productId, variantId, quantity } — set for Buy Now orders
}) => {
  try {
    if (!["cod", "razorpay", "wallet"].includes(paymentMethod)) {
      throw new AppError("Invalid payment method", HTTP_STATUS.BAD_REQUEST);
    }

    // ── Source: buy-now OR regular cart ──────────────────────────────────────
    let cartItems;
    let couponDiscount  = 0;
    let appliedCouponId = null;
    let cart            = null;

    if (buyNow) {
      // Single item, no coupon — fetch product fresh
      const product = await Products.findById(buyNow.productId)
        .populate("brand", "title")
        .lean();

      if (!product) throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);

      cartItems = [
        {
          productId: product,
          variantId: buyNow.variantId,
          quantity:  buyNow.quantity,
        },
      ];
    } else {
      cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        throw new AppError("Cart is empty", HTTP_STATUS.BAD_REQUEST);
      }

      cartItems       = cart.items;
      couponDiscount  = cart.couponDiscountAmount || 0;
      appliedCouponId = cart.appliedCoupon?.couponId || null;
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      throw new AppError("Invalid address", HTTP_STATUS.NOT_FOUND);
    }

    let orderItems = [];
    let subtotal = 0;
    let gstTotal = 0;
    let mrpTotal = 0;
    let productDiscount = 0;

    const orderNumber = await generateOrderNumber();

    // ================= LOOP =================
    for (const item of cartItems) {
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

      // 🔥 AVAILABLE STOCK CHECK
      const availableStock = variant.stock - (variant.reserved || 0);

      if (availableStock <= 0) {
        throw new AppError(`${product.name} is out of stock`, HTTP_STATUS.CONFLICT);
      }

      if (item.quantity > availableStock) {
        throw new AppError(`Only ${availableStock} available for ${product.name}`, HTTP_STATUS.CONFLICT);
      }

      // 🔥 PRICING — use product-specific offers (same as cart page)
      const productOffers = await getActiveOffers(product);
      const pricedVariant = calculateBestPrice(variant, productOffers);

      const qty = item.quantity;

      const basePrice = pricedVariant.basePrice;
      const gstAmount = pricedVariant.gstAmount;
      const finalPrice = pricedVariant.finalPrice;

      const itemSubtotal   = basePrice * qty;          // post-offer, pre-GST
      const itemMRP        = (variant.regular_price || variant.price) * qty; // MRP
      const itemGST        = gstAmount * qty;
      const itemFinal      = finalPrice * qty;
      const itemDiscount   = itemMRP - itemSubtotal;   // offer savings

      subtotal        += itemSubtotal;
      gstTotal        += itemGST;
      mrpTotal        += itemMRP;
      productDiscount += Math.max(0, itemDiscount);

      let updatedProduct;

      // ================= COD / WALLET =================
      if (paymentMethod === "cod" || paymentMethod === "wallet") {
        updatedProduct = await Products.findOneAndUpdate(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id:   variant._id,
                stock: { $gte: qty },
              },
            },
          },
          {
            $inc: { "variants.$.stock": -qty },
          },
          { returnDocument: "after" },
        );
      }

      // ================= RAZORPAY =================
      else if (paymentMethod === "razorpay") {
        updatedProduct = await Products.findOneAndUpdate(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id:      variant._id,
                reserved: { $lte: variant.stock - qty }, // prevent over-reserve
              },
            },
          },
          {
            $inc: { "variants.$.reserved": qty },
          },
          { returnDocument: "after" },
        );
      }

      // ❗ CHECK UPDATE SUCCESS
      if (!updatedProduct) {
        throw new AppError("Stock conflict, try again", HTTP_STATUS.CONFLICT);
      }

      // 🔥 UPDATED VARIANT
      const updatedVariant = updatedProduct.variants.id(variant._id);

      const finalAvailable =
        updatedVariant.stock - (updatedVariant.reserved || 0);

      // 🔥 SOCKET UPDATE
      if (global.io) {
        global.io.emit("stockUpdated", {
          productId: product._id,
          variantId: variant._id,
          stock: Math.max(finalAvailable, 0),
        });
      }

      // ================= ORDER ITEM =================
      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        userId,

        name: product.name,
        brand: product.brand?.title,

        attributes: variant.attributes || {},
        images: variant.product_images?.map((img) => img.url) || [],

        orderNumber,
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

        itemStatus: paymentMethod === "cod" || paymentMethod === "wallet" ? "placed" : "pending_payment",
      });
    }

    // ================= FINAL =================
    const finalPriceTotal = subtotal + gstTotal;                          // = sum of finalPrice×qty
    const deliveryCharge  = (finalPriceTotal - couponDiscount) >= 500 ? 0 : 40;
    const finalAmount     = finalPriceTotal - couponDiscount + deliveryCharge;

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 7);

    const order = await Order.create({
      userId,
      orderNumber,

      pricing: {
        subtotal:        finalPriceTotal,  // sum of finalPrice×qty (post-offer, GST included)
        productDiscount,                   // MRP - basePrice savings (for display)
        couponDiscount,
        deliveryCharge,
        gstTotal,                          // informational — already inside subtotal
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
        status: "pending",
      },

      orderStatus: paymentMethod === "cod" || paymentMethod === "wallet" ? "placed" : "pending_payment",

      delivery: {
        expectedDate,
      },
    });

    await orderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        orderId: order._id,
      })),
    );

    // 🧹 CLEAR CART — only for regular cart orders, not buy-now
    if (!buyNow && cart) {
      const appliedCouponId = cart.appliedCoupon?.couponId || null;
      cart.items = [];
      cart.couponDiscountAmount = 0;
      cart.appliedCoupon = { code: null, couponId: null, discountAmount: 0 };
      await cart.save();

      // Mark coupon as used
      if (appliedCouponId) {
        const { markCouponUsed } = await import("../product/coupon.service.js");
        await markCouponUsed({ userId, couponId: appliedCouponId });
      }
    }

    // 💳 WALLET PAYMENT — debit wallet and mark order paid
    if (paymentMethod === "wallet") {
      const { debitWallet } = await import("../user/wallet.service.js");
      await debitWallet({
        userId,
        amount:      finalAmount,
        description: `Payment for Order #${orderNumber}`,
        source:      "order_payment",
        orderId:     order._id,
      });
      order.payment.status         = "paid";
      order.payment.walletDeducted = finalAmount;
      await order.save();
    }

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
    // For razorpay orders that were never paid: stock was never decremented at placement,
    // only reserved was incremented. So release reserved, not stock.
    // For cod/wallet (or paid razorpay): stock was decremented — restore it.
    const isUnpaidRazorpay =
      order.payment.method === "razorpay" && order.payment.status !== "paid";

    if (isUnpaidRazorpay) {
      await Products.updateOne(
        {
          _id: item.productId,
          variants: {
            $elemMatch: { _id: item.variantId, reserved: { $gte: item.quantity } },
          },
        },
        { $inc: { "variants.$.reserved": -item.quantity } },
      );
    } else {
      await Products.updateOne(
        {
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId } },
        },
        { $inc: { "variants.$.stock": item.quantity } },
      );
    }

    // Emit socket update
    if (global.io) {
      const product = await Products.findById(item.productId).select("variants").lean();
      const variant = product?.variants?.find(v => String(v._id) === String(item.variantId));
      if (variant) {
        global.io.emit("stockUpdated", {
          productId: item.productId,
          variantId: item.variantId,
          stock: Math.max(variant.stock - (variant.reserved || 0), 0),
        });
      }
    }
  };

  const recalculateOrder = async () => {
    // All statuses that mean the item is no longer contributing to the order total
    const terminalStatuses = [
      "cancelled",
      "refund_pending",
      "refund_processed",
      "returned",
      "return_rejected",
    ];

    const activeItems = await orderItem.find({
      orderId,
      userId,
      itemStatus: { $nin: terminalStatuses },
    });

    // FULL CANCEL CASE — preserve original pricing for display, just mark as cancelled
    if (activeItems.length === 0) {
      order.orderStatus = "cancelled";
      order.isCancelled = true;
      order.cancelReason = reason;
      order.cancelComments = comments;
      order.cancelledAt = new Date();

      return 0;
    }

    // PARTIAL CANCEL — recalculate from remaining active items only
    let subtotal = 0;        // sum of item.pricing.total (finalPrice × qty, GST included)
    let productDiscount = 0;
    let gstTotal = 0;

    activeItems.forEach((i) => {
      subtotal        += i.pricing.total;           // finalPrice × qty (GST already inside)
      productDiscount += i.pricing.discountAmount || 0;
      gstTotal        += i.pricing.gstAmount || 0;
    });

    const couponDiscount = order.pricing.couponDiscount || 0;
    const deliveryCharge = order.pricing.deliveryCharge || 0;

    order.pricing.subtotal        = subtotal;
    order.pricing.productDiscount = productDiscount;
    order.pricing.gstTotal        = gstTotal;
    // finalAmount = subtotal (already includes GST) - coupon + delivery
    // do NOT add gstTotal again
    order.pricing.finalAmount = Math.max(
      subtotal - couponDiscount + deliveryCharge,
      0
    );

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

    // 💰 REFUND if paid via razorpay or wallet
    if (["razorpay", "wallet"].includes(order.payment.method) && order.payment.status === "paid") {
      const { processItemRefund } = await import("../product/refund.service.js");
      await processItemRefund({
        orderItemId: item._id,
        orderId:     order._id,
        userId:      order.userId,
        reason:      "cancellation",
        isCOD:       false,
      });
    }

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

    // 💰 REFUND per item
    if (["razorpay", "wallet"].includes(order.payment.method) && order.payment.status === "paid") {
      const { processItemRefund } = await import("../product/refund.service.js");
      await processItemRefund({
        orderItemId: item._id,
        orderId:     order._id,
        userId:      order.userId,
        reason:      "cancellation",
        isCOD:       false,
      });
    }

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
  itemCondition,
}) => {
  const item = await orderItem.findOne({ _id: orderItemId, userId });

  if (!item) throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);
  if (item.itemStatus !== "delivered") throw new AppError("Only delivered items can be returned", HTTP_STATUS.BAD_REQUEST);
  if (item.return?.requestedAt) throw new AppError("Return already requested");

  // Pre-determine stock action based on reason + condition
  const noRestockReasons = ["defective", "missing_parts", "damaged"];
  const inspectionReasons = ["wrong_item"];
  const restockableConditions = ["sealed_new", "opened_good"];

  let stockAction = "none";
  if (noRestockReasons.includes(returnReason)) {
    stockAction = "damaged_inventory";
  } else if (inspectionReasons.includes(returnReason)) {
    stockAction = "pending_inspection";
  } else if (itemCondition && restockableConditions.includes(itemCondition)) {
    stockAction = "restock";
  } else if (itemCondition) {
    stockAction = "damaged_inventory";
  }

  item.itemStatus = "return_requested";
  item.return = {
    reason:        returnReason,
    comments:      returnComments,
    itemCondition: itemCondition || null,
    stockAction,
    requestedAt:   new Date(),
  };

  await item.save();
  return item;
};
