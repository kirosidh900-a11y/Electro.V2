import { createRazorpayOrder } from "../../services/payment/crete.payment.service.js";
import {
  verifyPaymentSignature,
  handlePaymentSuccessService,
  handlePaymentFailureService,
  handleExperienceTimeout,
  retryPaymentService,
} from "../../services/payment/payment.service.js";
import { placeOrderService } from "../../services/user/order.service.js";
import { creditWallet } from "../../services/user/wallet.service.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

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

    // ================= CREATE RAZORPAY ORDER =================
    const razorpayOrder = await createRazorpayOrder(
      result.order.pricing.finalAmount,
    );

    const order = await handleExperienceTimeout({
      orderId: result.order._id,
      razorpayOrderId: razorpayOrder.id,
    });

    // ================= SEND RESPONSE =================
    console.log(order.payment?.expiresAt);


    const dateString = order.payment?.expiresAt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    console.log(dateString);
    
    const redirectUrl = `/order/success/${order.orderId}`;

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY,
      amount: order.pricing.finalAmount * 100,
      razorpayOrderId: razorpayOrder.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      expiresAt: order.payment.expiresAt, // 🔥 SEND EXPIRY TIME TO FRONTEND
      redirectUrl, // 🔥 SEND REDIRECT URL TO FRONTEND
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
      throw new AppError("Payment verification failed", HTTP_STATUS.BAD_REQUEST);
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

// RETRY PAYMENT
export const retryPaymentController = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const result = await retryPaymentService({ orderId, userId });

    res.json({
      success: true,
      key: result.key,
      amount: result.amount * 100,
      razorpayOrderId: result.razorpayOrderId,
      orderId: result.order._id,
      orderNumber: result.order.orderNumber,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Retry Payment Error:", error);
    next(error);
  }
};

// WALLET TOP-UP — create razorpay order
export const createWalletTopupOrder = async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < 1) throw new AppError("Invalid amount", HTTP_STATUS.BAD_REQUEST);

    const razorpayOrder = await createRazorpayOrder(amount);

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY,
      amount: amount * 100,
      razorpayOrderId: razorpayOrder.id,
    });
  } catch (err) {
    next(err);
  }
};

// WALLET TOP-UP — verify and credit
export const verifyWalletTopup = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const userId = req.user._id;

    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) throw new AppError("Payment verification failed", HTTP_STATUS.BAD_REQUEST);

    const newBalance = await creditWallet({
      userId,
      amount: parseFloat(amount),
      description: `Wallet top-up via Razorpay`,
      source: "top_up",
    });

    res.json({ success: true, message: "Wallet credited successfully", balance: newBalance });
  } catch (err) {
    next(err);
  }
};
