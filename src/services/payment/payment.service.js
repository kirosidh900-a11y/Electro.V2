import crypto from "crypto";
import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
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

  // 🔥 EXPIRE CHECK (VERY IMPORTANT)
  if (
    order.payment.method === "razorpay" &&
    order.payment.expiresAt &&
    new Date() > order.payment.expiresAt
  ) {
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
    // Use $elemMatch to correctly match the variant with both conditions
    const updatedProduct = await Products.findOneAndUpdate(
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

    // ❌ STOCK NOT AVAILABLE
    if (!updatedProduct) {
      order.payment.status = "failed";
      order.orderStatus = "cancelled";

      await order.save();

      await razorpay.payments.refund(paymentId, {
        amount: order.pricing.finalAmount * 100,
      });

      throw new AppError("Stock no longer available. Payment refunded.",HTTP_STATUS.BAD_REQUEST);
    }

    const updatedVariant = updatedProduct.variants.id(item.variantId);

    const availableStock =
      updatedVariant.stock - (updatedVariant.reserved || 0);

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

  // ✅ Do NOT touch reserved stock — it was never released on failure.
  // The reservation from placement is still intact and valid for this retry.

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
