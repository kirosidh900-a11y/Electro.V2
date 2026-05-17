import Address from "../../models/addressSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import Order from "../../models/orderSchema.model.js";

import { calculateBestPrice } from "../../utils/products/pricing.util.js";
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

      // ── Re-validate coupon at order time ─────────────────────────────────
      if (appliedCouponId) {
        const Coupon = (await import("../../models/couponSchema.model.js")).default;
        const coupon = await Coupon.findById(appliedCouponId);
        const now    = new Date();

        let couponInvalid = false;
        let couponMsg     = "";

        if (!coupon || !coupon.isActive) {
          couponInvalid = true;
          couponMsg     = "Applied coupon is no longer active. Please remove it and try again.";
        } else if (coupon.expiryDate < now) {
          couponInvalid = true;
          couponMsg     = "Applied coupon has expired. Please remove it and try again.";
        } else if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          couponInvalid = true;
          couponMsg     = "Applied coupon has reached its usage limit. Please remove it and try again.";
        } else if (coupon.perUserLimit !== null) {
          const userEntry = coupon.usedBy.find(u => String(u.userId) === String(userId));
          if (userEntry && userEntry.usedCount >= coupon.perUserLimit) {
            couponInvalid = true;
            couponMsg     = "You have already used this coupon the maximum number of times.";
          }
        }

        if (couponInvalid) {
          // Auto-clear the invalid coupon from cart
          cart.couponDiscountAmount = 0;
          cart.appliedCoupon = { code: null, couponId: null, discountAmount: 0 };
          await cart.save();
          throw new AppError(couponMsg, HTTP_STATUS.BAD_REQUEST);
        }
      }

      // ── Cart item existence check ─────────────────────────────────────────
      // Verify every product in the cart still exists and is listed.
      // Items whose product was deleted or unlisted are removed from the cart
      // and the user is told to review before placing the order.
      const invalidItems = cartItems.filter(item => {
        const p = item.productId; // populated
        return !p || p.isDeleted || p.status !== "listed";
      });

      if (invalidItems.length > 0) {
        // Remove the stale items from the cart automatically
        const invalidIds = new Set(invalidItems.map(i => String(i._id)));
        cart.items = cart.items.filter(i => !invalidIds.has(String(i._id)));
        await cart.save();

        const names = invalidItems
          .map(i => i.productId?.name || "Unknown product")
          .join(", ");

        throw new AppError(
          `Some items are no longer available and have been removed from your cart: ${names}. Please review your cart before placing the order.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      throw new AppError("Invalid address", HTTP_STATUS.NOT_FOUND);
    }

    let orderItems = [];
    let subtotal = 0;
    let gstTotal = 0;
    let productDiscount = 0;

    const orderNumber = await generateOrderNumber();

    // ================= LOOP =================
    for (const item of cartItems) {
      const product = item.productId;

      if (!product) {
        throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
      }

      // ── Listing validation: product / category / brand ───────────────
      if (product.isDeleted || product.status !== "listed") {
        throw new AppError(`${product.name} is no longer available`, HTTP_STATUS.BAD_REQUEST);
      }

      const [cat, brand] = await Promise.all([
        (await import("../../models/CategorySchema.model.js")).default.findById(product.category).select("status isDeleted").lean(),
        (await import("../../models/brandSchema.model.js")).default.findById(product.brand).select("status isDeleted").lean(),
      ]);

      if (!cat || cat.isDeleted || cat.status !== "listed") {
        throw new AppError(`${product.name} — category is no longer available`, HTTP_STATUS.BAD_REQUEST);
      }

      if (!brand || brand.isDeleted || brand.status !== "listed") {
        throw new AppError(`${product.name} — brand is no longer available`, HTTP_STATUS.BAD_REQUEST);
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
        subtotal:               finalPriceTotal,
        productDiscount,
        couponDiscount,
        originalCouponDiscount: couponDiscount,   // immutable snapshot for refund calc
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

    // 🧹 CLEAR CART — only for COD/Wallet (instant payment).
    // For Razorpay, cart is cleared AFTER payment is verified in handlePaymentSuccessService.
    // Clearing it here for Razorpay would empty the cart before the user even pays.
    if (!buyNow && cart && paymentMethod !== "razorpay") {
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

    // For Razorpay, snapshot the cart coupon so we can clear it after payment succeeds
    if (!buyNow && cart && paymentMethod === "razorpay") {
      order._cartId = cart._id;         // stored transiently — not persisted to DB
      order._cartCouponId = cart.appliedCoupon?.couponId || null;
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

    const allItems    = await orderItem.find({ orderId, userId });
    const activeItems = allItems.filter(i => !terminalStatuses.includes(i.itemStatus));

    // FULL CANCEL CASE — preserve original pricing for display, just mark as cancelled
    if (activeItems.length === 0) {
      order.orderStatus  = "cancelled";
      order.isCancelled  = true;
      order.cancelReason = reason;
      order.cancelComments = comments;
      order.cancelledAt  = new Date();
      return 0;
    }

    // PARTIAL CANCEL — recalculate from remaining active items only
    let subtotal        = 0;
    let productDiscount = 0;
    let gstTotal        = 0;

    activeItems.forEach((i) => {
      subtotal        += i.pricing.total;
      productDiscount += i.pricing.discountAmount || 0;
      gstTotal        += i.pricing.gstAmount      || 0;
    });

    // ── Proportional coupon discount ──────────────────────────────────────────
    // Use originalCouponDiscount (immutable) as the base so repeated partial
    // cancellations don't compound and over-reduce the coupon.
    const originalCouponDiscount = order.pricing.originalCouponDiscount ?? order.pricing.couponDiscount ?? 0;
    let remainingCouponDiscount  = 0;

    if (originalCouponDiscount > 0) {
      const allItemsTotal = allItems.reduce((sum, i) => sum + (i.pricing?.total ?? 0), 0);

      if (allItemsTotal > 0) {
        const activeShare = subtotal / allItemsTotal;
        remainingCouponDiscount = Math.round(originalCouponDiscount * activeShare);
      }
    }

    const deliveryCharge = order.pricing.deliveryCharge || 0;

    order.pricing.subtotal         = subtotal;
    order.pricing.productDiscount  = productDiscount;
    order.pricing.gstTotal         = gstTotal;
    order.pricing.couponDiscount   = remainingCouponDiscount;
    order.pricing.finalAmount      = Math.max(
      subtotal - remainingCouponDiscount + deliveryCharge,
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
