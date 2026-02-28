import { Router } from "express";
import {
  showLoginPage,
  showSignUpPage,
  signUp,
  verifyOtp,
  resendOtp,
  Login
} from "../../controllers/user/auth.controller.js";

const router = Router();

router.get("/login", showLoginPage).post("/login", Login)
router.route("/signup").get(showSignUpPage).post(signUp);
router.post("/verify-otp", verifyOtp);
router.patch("/resend-otp", resendOtp);

export default router;
