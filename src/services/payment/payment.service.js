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
  order.orderStatus = "confirmed";

  await order.save();

  // Update all order items from pending_payment → placed
  await orderItem.updateMany(
    { orderId, itemStatus: "pending_payment" },
    { $set: { itemStatus: "placed" } }
  );

  return order;
};

// HANDLE PAYMENT FAILURE
export const handlePaymentFailureService = async ({ orderId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const items = await orderItem.find({ orderId });

  // 🔥 RELEASE RESERVED STOCK — use $max to prevent going below 0
  for (const item of items) {
    // First get current reserved value
    const product = await Products.findOne(
      { _id: item.productId, "variants._id": item.variantId },
      { "variants.$": 1 }
    );
    const currentReserved = product?.variants?.[0]?.reserved ?? 0;
    const safeDecrement = Math.min(item.quantity, currentReserved);

    if (safeDecrement > 0) {
      await Products.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.reserved": -safeDecrement } }
      );
      await emitStockUpdate(item.productId, item.variantId);
    }
  }

  order.payment.status = "pending";
  order.orderStatus = "pending";

  await order.save();

  return order;
};

// RETRY PAYMENT — only allowed within 15 mins of last update
export const retryPaymentService = async ({ orderId, userId }) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  if (order.payment.method !== "razorpay") {
    throw new AppError("Retry only available for online payments", HTTP_STATUS.BAD_REQUEST);
  }

  if (order.payment.status === "paid") {
    throw new AppError("Payment already completed", HTTP_STATUS.BAD_REQUEST);
  }

  if (["delivered", "cancelled", "confirmed"].includes(order.orderStatus)) {
    throw new AppError("Order is not eligible for retry", HTTP_STATUS.BAD_REQUEST);
  }

  // 15-minute window check
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const elapsed = Date.now() - new Date(order.updatedAt).getTime();

  if (elapsed > FIFTEEN_MINUTES) {
    throw new AppError("Retry window expired. Please place a new order.", HTTP_STATUS.BAD_REQUEST);
  }

  // Re-reserve stock for items (they were released on failure)
  const items = await orderItem.find({ orderId });

  for (const item of items) {
    const updated = await Products.findOneAndUpdate(
      {
        _id: item.productId,
        "variants._id": item.variantId,
        "variants.reserved": { $lte: 999999 }, // just ensure field exists
      },
      { $inc: { "variants.$.reserved": item.quantity } },
      { returnDocument: "after" },
    );

    if (!updated) {
      throw new AppError(`Stock unavailable for ${item.name}`, HTTP_STATUS.CONFLICT);
    }
  }

  // Create a fresh Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: order.pricing.finalAmount * 100,
    currency: "INR",
  });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
  // ================= SAVE RAZORPAY ORDER ID =================
  order.payment.razorpayOrderId = razorpayOrderId;

  const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 10 mins

  order.payment.expiresAt = expiresAt;
  order.orderStatus = "pending_payment";

  await order.save();
  return order;
};
