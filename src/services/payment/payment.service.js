import crypto from "crypto";
import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

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

  const items = await orderItem.find({ orderId });

  // ================= STOCK UPDATE =================
  for (const item of items) {
    await Products.updateOne(
      {
        _id: item.productId,
        "variants._id": item.variantId,
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
          "variants.$.reserved": -item.quantity,
        },
      },
    );

    //GET UPDATED VALUE
    const updatedProduct = await Products.findById(item.productId);
    const updatedVariant = updatedProduct.variants.id(item.variantId);

    const availableStock =
      updatedVariant.stock - (updatedVariant.reserved || 0);

    // 🔥 SOCKET EMIT
    if (global.io) {
      global.io.emit("stockUpdated", {
        productId: item.productId,
        variantId: item.variantId,
        stock: availableStock,
      });
    }
  }

  // ================= ORDER UPDATE =================
  order.payment.status = "paid";
  order.payment.transactionId = paymentId;
  order.payment.paymentGatewayOrderId = razorpayOrderId;
  order.payment.signature = razorpay_signature;

  order.orderStatus = "placed";

  await order.save();

  return order;
};

// HANDLE PAYMENT FAILURE
export const handlePaymentFailureService = async ({ orderId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const items = await orderItem.find({ orderId });

  // 🔥 RELEASE RESERVED STOCK
  for (const item of items) {
    await Products.updateOne(
      {
        _id: item.productId,
        "variants._id": item.variantId,
      },
      {
        $inc: {
          "variants.$.reserved": -item.quantity,
        },
      },
    );
  }

  order.payment.status = "pending";
  order.orderStatus = "pending";

  await order.save();

  return order;
};

export const handleExperienceTimeout = async ({ orderId, razorpayOrderId }) => {

  const order = await Order.findById(orderId);
  
  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  // ================= SAVE RAZORPAY ORDER ID =================
  order.payment.razorpayOrderId = razorpayOrderId;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  order.payment.expiresAt = expiresAt;
  order.orderStatus = "pending_payment";

  await order.save();
};
