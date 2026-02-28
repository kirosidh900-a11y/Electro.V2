import AppError from "../utils/AppError.js";
import User from "../models/userSchema.model.js";
import Otp from "../models/otp.model.js";
import {sendEmail} from "../constant/transporter.js";
import argon2 from "argon2";

//Validate Email
export const isValidEmail = (email) => {
  email = email?.trim().toLowerCase();

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }
};

// Validate phone number
export const isValidPhone = (phone) => {
  phone = phone?.trim();
  const phoneRegex = /^\d{10}$/;

  if (!phone) {
    throw new AppError("Phone number is required", 400);
  }
  if (!phoneRegex.test(phone)) {
    throw new AppError("Invalid phone number format", 400);
  }
};

// Validate name
export const isValidName = (name) => {
  name = name?.trim();

  if (!name) {
    throw new AppError("Name is required", 400);
  }

  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

  if (!nameRegex.test(name)) {
    throw new AppError(
      "Name must contain only letters and single spaces between words",
      400,
    );
  }
};

// Validate password and confirm password
export const isConformPassword = (password, confirmPassword) => {
  if (!password || !confirmPassword) {
    throw new AppError("Password and confirm password are required", 400);
  }
  if (password !== confirmPassword) {
    throw new AppError("Passwords do not match", 400);
  }
};

// Validate password strength
export const isValidPassword = (password) => {
  password = password?.trim();

  if (!password) {
    throw new AppError("Password is required", 400);
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new AppError(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      400,
    );
  }
};

// Check if user already exists
export const isUserExist = async (email) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("Email already exists", 400);
  }
};

// Create referral code
export const createRef = async () => {
  let referralCode;
  let isExist = true;

  while (isExist) {
    referralCode = `ELECTRO${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const existingUser = await User.findOne({ referral: referralCode }); // ⚠ HERE

    if (!existingUser) {
      isExist = false;
    }
  }

  return referralCode;
};

// Validate referral code
export const isValidReferral = async (referral_by, currentEmail = null) => {
  referral_by = referral_by?.trim().toUpperCase();

  if (!referral_by) return null; // no referral used

  const existingUser = await User.findOne({ referral: referral_by });

  if (!existingUser) {
    throw new AppError("Invalid referral code", 400);
  }

  // Prevent self-referral (optional but recommended)
  if (currentEmail && existingUser.email === currentEmail) {
    throw new AppError("You cannot use your own referral code", 400);
  }

  return existingUser; // return referral owner
};

// Create OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

//send OTP to email
export const sendOtpToEmail = async ({
  email,
  name,
  phone,
  password,
  referral_by,
}) => {
  const otp = generateOTP();

  password = password.trim();
  let hashedPassword = password;

  if (!password.startsWith("$argon2")) {
    hashedPassword = await argon2.hash(password);
  }

  await Otp.create({
    email,
    otp,
    purpose: "signup",
    tempUserData: {
      name,
      phone,
      password: hashedPassword,
      referral_by,
    },
    expiresAt: new Date(Date.now() + 1 * 65 * 1000),
  });

  await sendEmail({ email, name, otp });

  console.log(`Sending OTP ${otp} to email: ${email}`);
};

// Verify OTP
export const otpExist = async (email, otp, purpose) => {
  const existingOtp = await Otp.findOne({ email, otp, purpose });
  return existingOtp;
};
