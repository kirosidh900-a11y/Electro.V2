import User from "../../models/userSchema.model.js";
import redisClient from "../../utils/partials/redisClient.util.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

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