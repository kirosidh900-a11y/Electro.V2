import User from "../../models/userSchema.model.js";
import redisClient from "../../utils/partials/redisClient.util.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import { hashPassword, verifyPassword } from "../../utils/partials/auth/password.utils.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../partials/cloudinary.service.js";
import { saveOTP, otpExist } from "../partials/otp.service.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import sendEmail from "../../constant/transporter.js";
import { sendSMS } from "../partials/sms.service.js";
import { findUserById, findUserByEmail, isUserExist } from "./auth.service.js";

export const getUserData = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -otp -__v -googleId",
  );
  return user;
};

// Forgot Password OTP Verification
export const verifyForgotOTP = async (email, otp, purpose) => {
  const key = `otp:${purpose}:${email}`;

  const stored = await redisClient.get(key);

  if (!stored) {
    throw new AppError("OTP expired or session not found", HTTP_STATUS.GONE);
  }

  const parsed = JSON.parse(stored);

  if (String(parsed.otp) !== String(otp)) {
    throw new AppError("Invalid OTP", HTTP_STATUS.BAD_REQUEST);
  }

  // Delete OTP after successful verification
  await redisClient.del(key);

  return true;
};

// Update user name
export const updateNameService = async (userId, name) => {
  const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
  if (!namePattern.test(name)) {
    throw new AppError("Name is invalid format!", HTTP_STATUS.BAD_REQUEST);
  }

  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);

  user.name = name;
  await user.save();
};

// Update user password
export const updatePasswordService = async (userId, currentPassword, newPassword) => {
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordPattern.test(newPassword)) {
    throw new AppError(
      "Password must be 8+ chars, include uppercase, lowercase, number & special character",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const user = await findUserById(userId, true);
  if (!user) throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);

  if (user.password) {
    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", HTTP_STATUS.BAD_REQUEST);
    }
  }

  user.password = await hashPassword(newPassword);
  await user.save();
};

// Send OTP to new email
export const sendEmailOtpService = async (userId, newEmail) => {
  const existing = await findUserByEmail(newEmail);
  if (existing) throw new AppError("Email already in use", HTTP_STATUS.BAD_REQUEST);

  const otp = generateOTP();
  await saveOTP(newEmail, otp, "reset-email");

  const user = await findUserById(userId);
  await sendEmail({ email: newEmail, name: user.name, otp });
};

// Verify OTP and update email
export const updateEmailService = async (userId, newEmail, otp) => {
  const [otpData] = await Promise.all([
    otpExist(newEmail, otp, "reset-email"),
    isUserExist(newEmail),
  ]);

  if (!otpData) {
    throw new AppError("Session is Expired or Invalid OTP, Try again", HTTP_STATUS.BAD_REQUEST);
  }

  const user = await findUserById(userId);
  user.email = newEmail;
  await user.save();
};

// Send OTP to new phone
export const sendPhoneOtpService = async (phone) => {
  if (!phone) throw new AppError("Phone is required", HTTP_STATUS.BAD_REQUEST);

  const otp = generateOTP();
  await saveOTP(phone, otp, "reset-phone");

  await sendSMS({ phone, message: `Your OTP is ${otp}. Do not share it.` });
};

// Verify OTP and update phone
export const updatePhoneService = async (userId, phone, otp) => {
  if (!phone || !otp) {
    throw new AppError("Phone and OTP required", HTTP_STATUS.BAD_REQUEST);
  }

  const isValid = await otpExist(phone, otp, "reset-phone");
  if (!isValid) throw new AppError("Invalid or expired OTP", HTTP_STATUS.BAD_REQUEST);

  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);

  user.phone = phone;
  await user.save();
};

// Upload / replace profile photo
export const updateProfilePhotoService = async (userId, fileBuffer) => {
  const user = await findUserById(userId);

  if (user?.photoId) {
    await deleteFromCloudinary(user.photoId);
  }

  const result = await uploadToCloudinary(fileBuffer, "profile");

  user.photo = result.secure_url;
  user.photoId = result.public_id;
  await user.save();

  return result.secure_url;
};

// Delete profile photo
export const deleteProfilePhotoService = async (userId) => {
  const user = await findUserById(userId);

  if (!user || !user.photoId) {
    throw new AppError("No photo found", HTTP_STATUS.BAD_REQUEST);
  }

  await deleteFromCloudinary(user.photoId);

  user.photo = null;
  user.photoId = null;
  await user.save();
};

// Get referral page data
export const getReferralDataService = async (userId) => {
  const user = await User.findById(userId)
    .select("referralCode referralCount")
    .lean();

  if (!user) throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);

  return {
    referralCode: user.referralCode,
    referralCount: user.referralCount ?? 0,
  };
};