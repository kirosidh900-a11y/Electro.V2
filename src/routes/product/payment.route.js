import express from "express";
import {
  verifyPaymentController,
  paymentFailureController,
  createPaymentOrder,
} from "../../controllers/product/payment.controller.js";

const router = express.Router();

// 💳 Create Razorpay Order
router.post("/create-order", createPaymentOrder);

// ✅ Verify Payment (success)
router.post("/verify", verifyPaymentController);

// ❌ Payment Failure 
router.post("/failure", paymentFailureController);

export default router;
