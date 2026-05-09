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
import {
  getBuyNowSession,
  clearBuyNowSession,
} from "../../services/user/checkout.service.js";

export const createPaymentOrder = async (req, res, next) => {
  try {
    const { addressId } = req.body;
    const userId = req.user._id;

    // Check if this is a buy-now order
    const buyNow = await getBuyNowSession(String(userId));

    // ================= CREATE ORDER IN DB =================
    const result = await placeOrderService({
      userId,
      addressId,
      paymentMethod: "razorpay",
      buyNow: buyNow || null,
    });

    // ================= CREATE RAZORPAY ORDER =================
    const razorpayOrder = await createRazorpayOrder(
      result.order.pricing.finalAmount,
    );

    const order = await handleExperienceTimeout({
      orderId: result.order._id,
      razorpayOrderId: razorpayOrder.id,
    });

    // Clear buy-now session — order is now in DB
    if (buyNow) await clearBuyNowSession(String(userId));

    const redirectUrl = `/order/success/${order.orderId}`;

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY,
      amount: order.pricing.finalAmount * 100,
      razorpayOrderId: razorpayOrder.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      expiresAt: order.payment.expiresAt,
      redirectUrl,
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

// RAZORPAY REDIRECT CALLBACK (used when redirect: true is set)
// Razorpay POSTs here after net banking / redirect-based payment completes.
// We verify the signature and redirect the browser to success or failure page.
export const razorpayCallbackController = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      error_code,
      error_description,
    } = req.body;

    // Find our DB order by the Razorpay order id
    const Order = (await import("../../models/orderSchema.model.js")).default;
    const order = await Order.findOne({ "payment.razorpayOrderId": razorpay_order_id })
      .select("_id orderNumber")
      .lean();

    // Razorpay sends error_code on failure (no valid signature)
    if (error_code || !razorpay_signature) {
      if (order) {
        await handlePaymentFailureService({ orderId: order._id });
      }
      const errMsg = encodeURIComponent(error_description || "Payment failed");
      const orderNum = order?.orderNumber ? encodeURIComponent(order.orderNumber) : "";
      return res.redirect(`/order/failure/${order?._id || ""}?error=${errMsg}&orderNumber=${orderNum}`);
    }

    if (!order) {
      return res.redirect("/orders?error=Order+not+found");
    }

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      await handlePaymentFailureService({ orderId: order._id });
      return res.redirect(
        `/order/failure/${order._id}?error=Signature+verification+failed&orderNumber=${encodeURIComponent(order.orderNumber)}`
      );
    }

    await handlePaymentSuccessService({
      orderId: order._id,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpay_signature,
    });

    return res.redirect(`/order/success/${order._id}`);
  } catch (err) {
    console.error("Razorpay Callback Error:", err);
    return res.redirect("/orders?error=Payment+processing+failed");
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
