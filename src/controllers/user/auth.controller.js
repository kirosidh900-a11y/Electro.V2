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
  isUserExist,
  isConformPassword,
  hashedPassword,
} from "../../utils/auth.utils.js";

import AppError from "../../utils/AppError.js";
import Otp from "../../models/otp.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../constant/transporter.js";
import User from "../../models/userSchema.model.js";
import dotenv from "dotenv";


dotenv.config();

export const showLoginPage = (req, res) => {
  res.render("user/auth/login");
};

export const Login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    await isValidateEmailAndPassword(email, password);

    const user = await User.findOne({ email });
    let expiresIn = "1h"; // Default token expiration
    let maxAge = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

    if (rememberMe) {
      expiresIn = "1d";
      maxAge = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    }

    // ✅ Generate Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn,
    });

    // ✅ Send HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge,
    });

    res.json({
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
    const { email , purpose } = req.body;

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

    await sendEmail({ email, name: otpDoc.tempUserData.name ?? "Unshare name!", otp: newOtp });

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
    console.log("Logging out user:", req.user);

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

    console.log(req.body)

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
