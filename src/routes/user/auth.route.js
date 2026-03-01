import { Router } from "express";
import {
  showLoginPage,
  showSignUpPage,
  signUp,
  verifyOtp,
  resendOtp,
  Login,
  logout,
  showForgotPasswordPage,
  verifyEmail
} from "../../controllers/user/auth.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();
router.route('/login').get(authMiddleware, showLoginPage).post(Login);
router.route("/signup").get( authMiddleware,showSignUpPage).post(signUp);
router.post("/verify-otp", verifyOtp);
router.patch("/resend-otp", resendOtp);
router.post("/logout", logout)
router.route('/forgot-password').get(showForgotPasswordPage).post(verifyEmail)

export default router;
