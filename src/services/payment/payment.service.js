import crypto from "crypto";
import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";

// 🔐 VERIFY SIGNATURE
export const verifyPaymentSignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
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
  paymentId
}) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const items = await orderItem.find({ orderId });

  // 🔥 UPDATE STOCK
  for (const item of items) {
    await Products.updateOne(
      {
        _id: item.productId,
        "variants._id": item.variantId
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
          "variants.$.reserved": -item.quantity
        }
      }
    );
  }

  // ✅ UPDATE ORDER
  order.payment.status = "paid";
  order.payment.paymentId = paymentId;
  order.orderStatus = "confirmed";

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
        "variants._id": item.variantId
      },
      {
        $inc: {
          "variants.$.reserved": -item.quantity
        }
      }
    );
  }

  order.payment.status = "pending";
  order.orderStatus = "pending";

  await order.save();

  return order;
};