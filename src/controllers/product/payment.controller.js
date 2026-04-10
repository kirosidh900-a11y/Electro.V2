import { createRazorpayOrder } from "../../services/payment/crete.payment.service.js";
import {
  verifyPaymentSignature,
  handlePaymentSuccessService,
  handlePaymentFailureService,
  handleExperienceTimeout,
} from "../../services/payment/payment.service.js";
import { placeOrderService } from "../../services/user/order.service.js";
import AppError from "../../utils/partials/AppError.utils.js";

export const createPaymentOrder = async (req, res, next) => {
  try {
    const { addressId } = req.body;
    const userId = req.user._id;

    console.log("ENV KEY:", process.env.RAZORPAY_KEY);

    // ================= CREATE ORDER IN DB =================
    const result = await placeOrderService({
      userId,
      addressId,
      paymentMethod: "razorpay",
    });

    const order = result.order;

    // ================= CREATE RAZORPAY ORDER =================
    const razorpayOrder = await createRazorpayOrder(order.pricing.finalAmount);

    await handleExperienceTimeout({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
    });

    // ================= SEND RESPONSE =================
    res.json({
      key: process.env.RAZORPAY_KEY,
      amount: order.pricing.finalAmount * 100,
      razorpayOrderId: razorpayOrder.id,
      orderId: order._id,
    });
  } catch (err) {
    console.error("Create Payment Order Error:", err);
    next(err);
  }
};

// VERIFY PAYMENT
export const verifyPaymentController = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      throw new AppError("Payment verification failed", 400);
    }

    await handlePaymentSuccessService({
      orderId,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpay_signature,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    next(error);
  }
};

// PAYMENT FAILURE
export const paymentFailureController = async (req, res) => {
  try {
    const { orderId } = req.body;

    await handlePaymentFailureService({ orderId });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
