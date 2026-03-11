import User from "../../models/userSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import Otp from "../../models/otpSchema.model.js";
import argon2 from "argon2";

import {
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidPassword,
  isConfirmPassword ,
} from "../../utils/partials/validation.utils.js";

import { isValidReferral, createRef } from "./referral.service.js";
import { checkGoogleAuth } from "../../utils/partials/auth/auth.util.js";

// Check if user already exists
export const isUserExist = async (email) => {
  const existingUser = await User.findOne({
    email: email.trim().toLowerCase(),
  });
  if (existingUser) {
    throw new AppError("Email already exists", HTTP_STATUS.BAD_REQUEST);
  }
  return false;
};

// Verify user for login
export const isVerifyUser = async (email, password) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new AppError("Invalid email or password", HTTP_STATUS.BAD_REQUEST);
  }

  // Handle Google Sign-In edge case
  checkGoogleAuth(user);

  const isPasswordValid = await argon2.verify(user.password, password);
  
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", HTTP_STATUS.BAD_REQUEST);
  }

  return user;
};

// Create user
export const addUser = async ({
  name,
  email,
  phone,
  password,
  referral_by,
}) => {
  const referralCode = await createRef();

  const newUser = await User.create({
    name,
    email,
    phone,
    password,
    referralCode,
    referral_by,
  });
  return newUser;
};

// Validate data
export const isValidate = async (data) => {
  const { name, email, phone, password, confirmPassword, referral_by } = data;

  //Basic validation
  isValidEmail(email);
  isConfirmPassword(password, confirmPassword);
  isValidName(name);
  isValidPhone(phone);
  isValidPassword(password);

  //Database validation
  await isUserExist(email);
  await isValidReferral(referral_by, email);
};

export const verifyForgotOTP = async (email, otp, purpose) => {
  const otpRecord = await Otp.findOne({ email, otp, purpose });

  if (!otpRecord) {
    throw new AppError(
      "Invalid OTP or Session Expired",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new AppError("OTP expired", HTTP_STATUS.BAD_REQUEST);
  }

  await Otp.deleteMany({ email, purpose });
  return true;
};

export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};
