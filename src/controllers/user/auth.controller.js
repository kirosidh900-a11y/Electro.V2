/* ===============================
   📦 Imports
================================= */

// Constants
import HTTP_STATUS from "../../constant/statusCode.js";

// Services
import {
  isValidate,
  addUser,
  isVerifyUser,
  verifyForgotOTP,
  findUserByEmail,
} from "../../services/user/auth.service.js";

import {
  sendOtpToEmail,
  otpExist,
  saveOTP,
  findOtp,
  deleteOtp,
} from "../../services/partials/otp.service.js";

// Utils
import { checkIfBlocked } from "../../utils/partials/auth/auth.util.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import { isConfirmPassword } from "../../utils/partials/validation.utils.js";
import generateJWT from "../../utils/partials/jwt.utils.js";
import setAuthCookie from "../../utils/partials/setAuthCookie.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";
import { hashPassword } from "../../utils/partials/auth/password.utils.js";
import AppError from "../../utils/partials/AppError.utils.js";

// External
import passport from "passport";
import sendEmail from "../../constant/transporter.js";

import {
  errorResponse,
  successResponse,
} from "../../utils/partials/response.util.js";

/* ================= LOGIN ================= */

export const showLoginPage = (req, res) => {
  const error = req.cookies.toastError || null;
  const token = req.cookies?.token;

  if (token) {
    return res.redirect("/");
  }

  clearAuthCookie(res, "toastError");

  res.render("user/auth/login", { error });
};

export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await isVerifyUser(email, password);

    await checkIfBlocked(user);

    const token = generateJWT(user, rememberMe);

    setAuthCookie(res, token, "user");

    return successResponse(res, "Login successful", HTTP_STATUS.OK, {
      redirectUrl: "/",
    });
  } catch (err) {
    next(err);
  }
};

/* ================= SIGNUP ================= */

export const showSignUpPage = (req, res) => {
  const token = req.cookies.token;

  if (token) {
    return res.redirect("/");
  }
  
  res.render("user/auth/signup");
};

export const signUp = async (req, res, next) => {
  try {
    await isValidate(req.body);

    await sendOtpToEmail(req.body);

    return successResponse(res, "OTP sent to your email", HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;

    const existingOtp = await otpExist(email, otp, purpose);

    if (!existingOtp) {
      throw new AppError("Invalid or expired OTP", HTTP_STATUS.BAD_REQUEST);
    }

    if (!existingOtp?.tempUserData) {
      throw new AppError(
        "OTP data corrupted or expired",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await addUser({
      email,
      ...existingOtp.tempUserData,
    });

    await deleteOtp({ email, purpose });

    return successResponse(
      res,
      "Account created successfully",
      HTTP_STATUS.CREATED,
    );
  } catch (err) {
    next(err);
  }
};

/* ================= RESEND OTP ================= */

export const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const otpDoc = await findOtp(email, purpose);

    if (!otpDoc) {
      return errorResponse(res, "OTP session expired", HTTP_STATUS.GONE);
    }

    const newOtp = generateOTP();

    await saveOTP(email, newOtp, purpose);

    await sendEmail({
      email,
      name: (otpDoc?.tempUserData?.name || res.locals.user?.name) ?? "User",
      otp: newOtp,
    });

    return successResponse(res, "OTP resent successfully");
  } catch (err) {
    next(err);
  }
};

/* ================= FORGOT PASSWORD ================= */

export const showForgotPasswordPage = (req, res) => {
  res.render("user/auth/forgot");
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
      return errorResponse(res, "Email not found", HTTP_STATUS.NOT_FOUND);
    }

    const otp = generateOTP();

    await saveOTP(email, otp, purpose);

    await sendEmail({
      email,
      name: user.name,
      otp,
    });

    return successResponse(res, "OTP sent to your email", HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/* ================= VERIFY FORGOT PASSWORD OTP ================= */

export const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;

    await verifyForgotOTP(email, otp, purpose);

    return successResponse(res, "OTP verified successfully", HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/* ================= SAVE NEW PASSWORD ================= */

export const savePassword = async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    isConfirmPassword(password, confirmPassword);

    const hashedPassword = await hashPassword(password);

    const user = await findUserByEmail(email);

    if (!user) {
      return errorResponse(res, "Email not found", HTTP_STATUS.NOT_FOUND);
    }

    user.password = hashedPassword;

    await user.save();

    return successResponse(
      res,
      "Password updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (err) {
    next(err);
  }
};

/* ================= LOGOUT ================= */

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res, "token");

    return successResponse(res, "Logged out successfully", HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/* ================= GOOGLE AUTH ================= */

export const passportRedirect = passport.authenticate("google-user", {
  scope: ["profile", "email"],
});

export const googleUserAuth = passport.authenticate("google-user", {
  session: false,
  failureRedirect: "/login",
});
