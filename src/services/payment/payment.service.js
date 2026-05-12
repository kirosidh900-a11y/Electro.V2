import crypto from "crypto";
import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import razorpay from "../../config/razorpay.config.js";

const emitStockUpdate = async (productId, variantId) => {
  if (!global.io) return;
  const product = await Products.findById(productId).select("variants").lean();
  const variant = product?.variants?.find(v => String(v._id) === String(variantId));
  if (variant) {
    global.io.emit("stockUpdated", {
      productId,
      variantId,
      stock: Math.max(variant.stock - (variant.reserved || 0), 0),
    });
  }
};

// 🔐 VERIFY SIGNATURE
export const verifyPaymentSignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};

// HANDLE PAYMENT SUCCESS
export const handlePaymentSuccessService = async ({
  orderId,
  paymentId,
  razorpayOrderId,
  razorpay_signature,
}) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // 🔥 EXPIRE CHECK — payment arrived after the 15-min window
  if (
    order.payment.method === "razorpay" &&
    order.payment.expiresAt &&
    new Date() > order.payment.expiresAt
  ) {
    // Release reserved stock before cancelling (same logic as the expiry cron job)
    const expiredItems = await orderItem.find({ orderId });
    for (const item of expiredItems) {
      const releaseResult = await Products.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.reserved": -item.quantity } },
      );
      // Clamp to 0 if we went negative
      if (releaseResult.modifiedCount > 0) {
        await Products.updateOne(
          { _id: item.productId, "variants._id": item.variantId, "variants.reserved": { $lt: 0 } },
          { $set: { "variants.$.reserved": 0 } },
        );
      }
    }

    order.payment.status = "failed";
    order.orderStatus = "cancelled";
    await order.save();

    // 🔥 REFUND
    await razorpay.payments.refund(paymentId, {
      amount: order.pricing.finalAmount * 100,
    });

    throw new AppError("Payment expired. Refunded.", HTTP_STATUS.BAD_REQUEST);
  }

  const items = await orderItem.find({ orderId });

  for (const item of items) {
    // Try the normal path: stock >= qty AND reserved >= qty → decrement both atomically
    let updatedProduct = await Products.findOneAndUpdate(
      {
        _id: item.productId,
        variants: {
          $elemMatch: {
            _id:      item.variantId,
            stock:    { $gte: item.quantity },
            reserved: { $gte: item.quantity },
          },
        },
      },
      {
        $inc: {
          "variants.$.stock":    -item.quantity,
          "variants.$.reserved": -item.quantity,
        },
      },
      { returnDocument: "after" },
    );

    // Fallback: reservation was already released (e.g. cron ran before payment arrived)
    // but stock is still available — decrement stock directly
    if (!updatedProduct) {
      updatedProduct = await Products.findOneAndUpdate(
        {
          _id: item.productId,
          variants: {
            $elemMatch: {
              _id:   item.variantId,
              stock: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: { "variants.$.stock": -item.quantity },
        },
        { returnDocument: "after" },
      );
    }

    // ❌ STOCK NOT AVAILABLE — neither path worked
    if (!updatedProduct) {
      order.payment.status = "failed";
      order.orderStatus = "cancelled";

      await order.save();

      await razorpay.payments.refund(paymentId, {
        amount: order.pricing.finalAmount * 100,
      });

      throw new AppError("Stock no longer available. Payment refunded.", HTTP_STATUS.BAD_REQUEST);
    }

    const updatedVariant = updatedProduct.variants.id(item.variantId);
    const availableStock = updatedVariant.stock - (updatedVariant.reserved || 0);

    if (global.io) {
      global.io.emit("stockUpdated", {
        productId: item.productId,
        variantId: item.variantId,
        stock: Math.max(availableStock, 0),
      });
    }
  }

  // ================= SUCCESS =================
  order.payment.status = "paid";
  order.payment.transactionId = paymentId;
  order.payment.paymentGatewayOrderId = razorpayOrderId;
  order.payment.signature = razorpay_signature;
  order.orderStatus = "placed";

  await order.save();

  // Update all order items from pending_payment → placed
  await orderItem.updateMany(
    { orderId, itemStatus: "pending_payment" },
    { $set: { itemStatus: "placed" } }
  );

  // 🧹 CLEAR CART — now that payment is confirmed, remove cart items.
  // This was intentionally deferred from placeOrderService so the cart stays
  // intact while the user is inside the Razorpay payment popup.
  const cart = await Cart.findOne({ userId: order.userId });
  if (cart && cart.items.length > 0) {
    const cartCouponId = cart.appliedCoupon?.couponId || null;
    cart.items = [];
    cart.couponDiscountAmount = 0;
    cart.appliedCoupon = { code: null, couponId: null, discountAmount: 0 };
    await cart.save();

    // Mark coupon as used now that payment is confirmed
    if (cartCouponId) {
      const { markCouponUsed } = await import("../product/coupon.service.js");
      await markCouponUsed({ userId: order.userId, couponId: cartCouponId });
    }
  }

  return order;
};

// HANDLE PAYMENT FAILURE
// Stock is NOT touched here — reserved stays intact so the user can retry
// within the 15-min window. The expiry cron job releases reserved after 15 min.
export const handlePaymentFailureService = async ({ orderId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Only mark payment as failed — keep orderStatus as pending_payment for retry
  // Do NOT touch reserved stock — expiry job handles that after 15 min
  order.payment.status = "failed";
  await order.save();

  return order;
};

// RETRY PAYMENT — only allowed within 15 mins of order creation
export const retryPaymentService = async ({ orderId, userId }) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  if (order.payment.method !== "razorpay") {
    throw new AppError("Retry only available for online payments", HTTP_STATUS.BAD_REQUEST);
  }

  if (order.payment.status === "paid") {
    throw new AppError("Payment already completed", HTTP_STATUS.BAD_REQUEST);
  }

  if (["placed", "delivered", "cancelled", "confirmed", "shipped", "out_for_delivery"].includes(order.orderStatus)) {
    throw new AppError("Order is not eligible for retry", HTTP_STATUS.BAD_REQUEST);
  }

  // 15-minute window — measured from order creation (never changes)
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const elapsed = Date.now() - new Date(order.createdAt).getTime();

  if (elapsed > FIFTEEN_MINUTES) {
    throw new AppError("Retry window expired. Please place a new order.", HTTP_STATUS.BAD_REQUEST);
  }

  // ── Validate all order items: product / category / brand must still be listed ──
  const items = await orderItem.find({ orderId });

  const Category = (await import("../../models/CategorySchema.model.js")).default;
  const Brand    = (await import("../../models/brandSchema.model.js")).default;

  for (const item of items) {
    const product = await Products.findById(item.productId).lean();

    if (!product || product.isDeleted || product.status !== "listed") {
      throw new AppError(
        `"${item.name}" is no longer available. Please place a new order.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const [cat, brand] = await Promise.all([
      Category.findById(product.category).select("status isDeleted").lean(),
      Brand.findById(product.brand).select("status isDeleted").lean(),
    ]);

    if (!cat || cat.isDeleted || cat.status !== "listed") {
      throw new AppError(
        `"${item.name}" — its category is no longer available. Please place a new order.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!brand || brand.isDeleted || brand.status !== "listed") {
      throw new AppError(
        `"${item.name}" — its brand is no longer available. Please place a new order.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // ── Re-check stock: ensure reservation is still intact, or re-reserve ──
    const variant = product.variants.find(v => String(v._id) === String(item.variantId));
    if (!variant) {
      throw new AppError(`"${item.name}" variant no longer exists.`, HTTP_STATUS.BAD_REQUEST);
    }

    const availableStock = variant.stock - (variant.reserved || 0);

    // If reservation was already released (e.g. cron ran early), re-reserve now
    if ((variant.reserved || 0) < item.quantity) {
      // Check there's enough free stock to re-reserve
      if (availableStock < item.quantity) {
        throw new AppError(
          `"${item.name}" is out of stock. Please place a new order.`,
          HTTP_STATUS.CONFLICT
        );
      }
      // Re-reserve
      await Products.updateOne(
        {
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId } },
        },
        { $inc: { "variants.$.reserved": item.quantity } }
      );
      await emitStockUpdate(item.productId, item.variantId);
    }
  }

  // ── Re-validate coupon if one was applied ────────────────────────────────
  if (order.pricing.couponDiscount > 0 || order.pricing.originalCouponDiscount > 0) {
    // Find the cart to get the coupon id (it may still be in cart for razorpay orders)
    const Cart = (await import("../../models/cartSchema.models.js")).default;
    const cart = await Cart.findOne({ userId });
    const couponId = cart?.appliedCoupon?.couponId;

    if (couponId) {
      const Coupon = (await import("../../models/couponSchema.model.js")).default;
      const coupon = await Coupon.findById(couponId);
      const now    = new Date();

      let couponInvalid = false;
      let couponMsg     = "";

      if (!coupon || !coupon.isActive) {
        couponInvalid = true;
        couponMsg     = "The coupon applied to this order is no longer active.";
      } else if (coupon.expiryDate < now) {
        couponInvalid = true;
        couponMsg     = "The coupon applied to this order has expired.";
      } else if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        couponInvalid = true;
        couponMsg     = "The coupon applied to this order has reached its usage limit.";
      }

      if (couponInvalid) {
        // Remove coupon discount from order pricing
        const discount = order.pricing.couponDiscount || 0;
        order.pricing.couponDiscount         = 0;
        order.pricing.originalCouponDiscount = 0;
        order.pricing.finalAmount            = Math.max(order.pricing.finalAmount + discount, 0);

        // Clear coupon from cart too
        if (cart) {
          cart.couponDiscountAmount = 0;
          cart.appliedCoupon = { code: null, couponId: null, discountAmount: 0 };
          await cart.save();
        }

        await order.save();
        throw new AppError(`${couponMsg} Order total has been updated — please retry.`, HTTP_STATUS.BAD_REQUEST);
      }
    }
  }

  // Create a fresh Razorpay order (new payment attempt, same DB order)
  const razorpayOrder = await razorpay.orders.create({
    amount: order.pricing.finalAmount * 100,
    currency: "INR",
  });

  // Keep expiry aligned to the original 15-min window from order creation
  // so the cron job cleans up correctly and the user can't extend indefinitely
  const expiresAt = new Date(new Date(order.createdAt).getTime() + 15 * 60 * 1000);

  order.payment.razorpayOrderId = razorpayOrder.id;
  order.payment.expiresAt = expiresAt;
  order.payment.status = "pending";
  order.orderStatus = "pending_payment";

  await order.save();

  return {
    order,
    razorpayOrderId: razorpayOrder.id,
    amount: order.pricing.finalAmount,
    key: process.env.RAZORPAY_KEY,
    expiresAt,
  };
};

export const handleExperienceTimeout = async ({ orderId, razorpayOrderId }) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  order.payment.razorpayOrderId = razorpayOrderId;

  // 15 minutes — matches the retry window shown to the user
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  order.payment.expiresAt = expiresAt;
  order.orderStatus = "pending_payment";

  await order.save();
  return order;
};
