import dotenv from "dotenv";
dotenv.config();

/* ===============================
   📦 Imports
================================= */

// Constants
import HTTP_STATUS from "../../constant/statusCode.js";

// Models
import User from "../../models/userSchema.model.js";
import Otp from "../../models/otpSchema.model.js";

// Services
import {
  isValidate,
  addUser,
  isVerifyUser,
} from "../../services/user/auth.service.js";

import {
  sendOtpToEmail,
  otpExist,
} from "../../services/partials/otp.service.js";

// Utils
import { checkIfBlocked } from "../../utils/user/auth.utils.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import { hashedPassword } from "../../utils/partials/hashHelper.utils.js";
import generateJWT from "../../utils/partials/jwt.utils.js";
import { setAuthCookie } from "../../utils/partials/setAuthCookie.js";
import { isConformPassword } from "../../utils/partials/validation.utils.js";
import AppError from "../../utils/partials/AppError.js";

// External
import passport from "passport";
import sendEmail from "../../constant/transporter.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";

/* ===============================
   🔐 AUTH CONTROLLERS
================================= */

// ================= LOGIN =================

export const showLoginPage = (req, res) => {
  res.render("user/auth/login");
};

export const Login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await isVerifyUser(email, password);
    await checkIfBlocked(user);

    const token = generateJWT(user, rememberMe);
    setAuthCookie(res, token, "user");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      redirectUrl: "/",
    });
  } catch (err) {
    next(err);
  }
};

// ================= SIGNUP =================

export const showSignUpPage = (req, res) => {
  res.render("user/auth/signup");
};

export const signUp = async (req, res, next) => {
  try {
    await isValidate(req.body);
    await sendOtpToEmail(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
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

    await addUser({ email, ...existingOtp.tempUserData });

    await Otp.deleteMany({ email, purpose });

    res.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const otpDoc = await Otp.findOne({ email, purpose });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "Signup session expired",
      });
    }

    const newOtp = generateOTP();

    otpDoc.otp = newOtp;
    otpDoc.expiresAt = new Date(Date.now() + 65 * 1000);

    await otpDoc.save();

    await sendEmail({
      email,
      name: otpDoc.tempUserData?.name ?? "User",
      otp: newOtp,
    });

    res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ================= LOGOUT =================
export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res, "token");

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ================= FORGOT PASSWORD =================

export const showForgotPasswordPage = (req, res) => {
  res.render("user/auth/forgot");
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Email not found",
      });
    }

    // checkIfBlocked(user);

    const otp = generateOTP();

    const otpDoc = new Otp({
      email,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await otpDoc.save();

    await sendEmail({ email, name: user.name, otp });

    res.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (err) {
    next(err);
  }
};

export const savePassword = async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    isConformPassword(password, confirmPassword);

    const hashPassword = await hashedPassword(password);

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { password: hashPassword } },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ================= GOOGLE AUTH =================

export const passportRed = (req, res, next) => {
  return passport.authenticate("google-user", {
    scope: ["profile", "email"],
  })(req, res, next);
};

export const googleUserAuth = (req, res, next) => {
  passport.authenticate("google-user", {
    session: false,
    failureRedirect: "/login",
  })(req, res, next);
};