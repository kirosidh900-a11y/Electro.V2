import { Router } from "express";
import passport from "../../config/passport.js";

import {
  showLoginPage,
  showSignUpPage,
  signUp,
  verifySignupOtp,
  resendOtp,
  login,
  logout,
  showForgotPasswordPage,
  verifyEmail,
  savePassword,
  passportRedirect,
  verifyForgotPasswordOtp,
} from "../../controllers/user/auth.controller.js";

import attachUser from "../../middlewares/attachUser.middleware.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import generateJWT from "../../utils/partials/jwt.utils.js";
import setCookieMSG from "../../utils/partials/setCookieMsg.utils.js";
import setAuthCookie from "../../utils/partials/setAuthCookie.js";
import {
  loginLimiter,
  signupLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
} from "../../middlewares/rateLimiter.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

//  AUTH PAGES
router
  .route("/login")
  .get(authMiddleware, showLoginPage)
  .post(authMiddleware, loginLimiter, login);

router
  .route("/signup")
  .get(authMiddleware, showSignUpPage)
  .post(authMiddleware, signupLimiter, signUp);

// SignUp Verify
router.post("/verify-otp", authMiddleware, otpVerifyLimiter, verifySignupOtp);
router.patch("/resend-otp", authMiddleware, otpSendLimiter, resendOtp);

// Forgot-password
router
  .route("/forgot-password")
  .get(authMiddleware, showForgotPasswordPage)
  .post(authMiddleware, otpSendLimiter, verifyEmail);

// Forgot Verify otp
router.post("/verifyFog-otp", authMiddleware, otpVerifyLimiter, verifyForgotPasswordOtp);

router.patch("/reset-password", authMiddleware, passwordResetLimiter, savePassword);

//  LOGOUT
router.post("/logout", logout);

//  GOOGLE LOGIN

// Redirect to Google
router.get("/google-user", authMiddleware, passportRedirect);

// Google Callback
router.get("/google-user/callback", (req, res, next) => {
  passport.authenticate(
    "google-user",
    { session: false },
    (err, user, info) => {

      // LOGIN FAILED
      if (!user) {
        res.clearCookie("token");
        setCookieMSG(res, info?.message || "Login failed");
        return res.redirect("/auth/login");
      }

      // LOGIN SUCCESS
      const token = generateJWT(user, "1h");
      setAuthCookie(res, token, "user");
      return res.redirect("/");
    },
  )(req, res, next);
});

export default router;
