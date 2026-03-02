import HTTP_STATUS from "../../constant/statusCode.js";
import {
  isValidate,
  addUser,
  isValidateEmailAndPassword,
} from "../../services/user/auth.service.js";

import {
  sendOtpToEmail,
  otpExist,
  generateOTP,
  isConformPassword,
  hashedPassword,
} from "../../utils/auth.utils.js";

import AppError from "../../utils/AppError.js";
import Otp from "../../models/otp.model.js";
import { sendEmail } from "../../constant/transporter.js";
import User from "../../models/userSchema.model.js";
import dotenv from "dotenv";
import { generateJWT } from "../../utils/user/jwt.utils.js";
import passport from "passport";
import { setAuthCookie } from "../../utils/user/setAuthCookie.js";

dotenv.config();

export const showLoginPage = (req, res) => {
  res.render("user/auth/login");
};

export const Login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    await isValidateEmailAndPassword(email, password);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // CHECK IF BLOCKED
    if (user.isBlock) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked ❌",
      });
    }

    let maxAge = 1 * 60 * 60 * 1000; // 1 hour

    if (rememberMe) {
      maxAge = 24 * 60 * 60 * 1000; // 1 day
    }

    // ✅ Generate JWT
    const token = await generateJWT(user, rememberMe);

    // ✅ Set cookie
    setAuthCookie(res,token)

    return res.json({
      success: true,
      message: "Login successful",
      redirectUrl: "/",
    });

  } catch (err) {
    next(err);
  }
};
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
      throw new AppError("Invalid or expired OTP", 400);
    }

    const { name, phone, password } = existingOtp.tempUserData;

    await addUser({ name, email, phone, password });

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
      name: otpDoc.tempUserData.name ?? "Unshare name!",
      otp: newOtp,
    });

    console.log(`Resent OTP ${newOtp} to ${email}`);

    res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const showForgotPasswordPage = (req, res) => {
  res.render("user/auth/forgot");
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    console.log(req.body);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Email not found",
      });
    }

    const otp = generateOTP();

    const otpDoc = new Otp({
      email,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await otpDoc.save();

    await sendEmail({ email, name: user.name, otp });

    console.log(`Sent OTP ${otp} to ${email}`);

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
