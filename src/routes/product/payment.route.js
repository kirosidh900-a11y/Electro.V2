import express from "express";
import {
  verifyPaymentController,
  paymentFailureController,
  createPaymentOrder,
  retryPaymentController,
  createWalletTopupOrder,
  verifyWalletTopup,
} from "../../controllers/product/payment.controller.js";

const router = express.Router();

// 💳 Create Razorpay Order
router.post("/create-order", createPaymentOrder);

// ✅ Verify Payment (success)
router.post("/verify", verifyPaymentController);

// ❌ Payment Failure 
router.post("/failure", paymentFailureController);

// 🔄 Retry Payment (within 15 min window)
router.post("/retry/:orderId", retryPaymentController);

// 💰 Wallet Top-up
router.post("/wallet/create-order", createWalletTopupOrder);
router.post("/wallet/verify", verifyWalletTopup);

export default router;
