import { Router } from "express";
import { setAuthCookie } from "../../utils/user/setAuthCookie.js";
import passport from "../../config/passport.js";

import {
  showLoginPage,
  showSignUpPage,
  signUp,
  verifyOtp,
  resendOtp,
  Login,
  logout,
  showForgotPasswordPage,
  verifyEmail,
  savePassword,
  passportRed,
  googleUserAuth,
} from "../../controllers/user/auth.controller.js";


import authMiddleware from "../../middlewares/auth.middleware.js";

import { generateJWT } from "../../utils/user/jwt.utils.js";

const router = Router();

//  AUTH PAGES

router.route("/login").get(authMiddleware, showLoginPage).post(Login);

router.route("/signup").get(authMiddleware, showSignUpPage).post(signUp);

router.post("/verify-otp", verifyOtp);
router.patch("/resend-otp", resendOtp);

router.route("/forgot-password").get(showForgotPasswordPage).post(verifyEmail);

router.patch("/reset-password", savePassword);

/* =====================================================
   LOGOUT
===================================================== */
router.post("/logout", logout);

//  GOOGLE LOGIN

// Redirect to Google
router.get("/google-user", authMiddleware, passportRed);

// Google Callback
router.get("/google-user/callback", (req, res, next) => {
  passport.authenticate(
    "google-user",
    { session: false },
    (err, user, info) => {

      // ❌ LOGIN FAILED
      if (!user) {
        res.clearCookie("token", { path: "/" });

        res.cookie(
          "authResult",
          encodeURIComponent(
            JSON.stringify({
              success: false,
              message: info?.message || "Login failed",
            })
          ),
          { maxAge: 5000, path: "/" }
        );

        return res.redirect("/auth/login");
      }

      // ✅ LOGIN SUCCESS
      const token = generateJWT(user, "1h");

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
        path: "/",
      });

      res.cookie(
        "authResult",
        encodeURIComponent(
          JSON.stringify({
            success: true,
            message: "Login successful 🎉",
          })
        ),
        { maxAge: 5000, path: "/" }
      );

      return res.redirect("/");
    }
  )(req, res, next);
});

export default router;
