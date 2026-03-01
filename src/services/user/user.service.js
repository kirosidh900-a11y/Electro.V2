import User from "../../models/userSchema.model.js";
import Otp from "../../models/otp.model.js";
import AppError from "../../utils/AppError.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const getUserData = async (userId) => {
  const user = await User.findById(userId).select("-password -otp -__v");
  return user;
};

export const verifyEmail = async (email, otp, purpose) => {
  const otpRecord = await Otp.findOne({ email, otp, purpose });

  if (!otpRecord) {
    throw new AppError("Invalid OTP", HTTP_STATUS.BAD_REQUEST);
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new AppError("OTP expired", HTTP_STATUS.BAD_REQUEST);
  }

  await Otp.deleteMany({ email, purpose });
  return true;
};
