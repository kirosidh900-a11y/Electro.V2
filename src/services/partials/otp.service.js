import Otp from "../../models/otpSchema.model.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import sendEmail from "../../constant/transporter.js";
import { hashPassword } from "../../utils/partials/auth/password.utils.js";
import AppError from "../../utils/partials/AppError.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import { OTP_EXPIRY } from "../../constant/auth.constant.js";

// Send OTP Thought Clinet
export const sendOtpToEmail = async ({
  email,
  name,
  phone,
  password,
  referral_by,
}) => {
  if (!email || !password) {
    throw new AppError(
      "Email and password are required",
      HTTP_STATUS.NOT_FOUND,
    );
  }

  const otp = generateOTP();

  const finalPassword = password.startsWith("$argon2")
    ? password
    : await hashPassword(password);

  await Otp.create({
    email,
    otp,
    purpose: "signup",
    tempUserData: { name, phone, password: finalPassword, referral_by },
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  });

  await sendEmail({ email, name, otp });

  console.log(`[Service] OTP ${otp} generated for ${email}`);
};

// Verify OTP
export const otpExist = async (email, otp, purpose) => {
  const existingOtp = await Otp.findOne({ email, otp, purpose });
  return existingOtp;
};

export const findOtp = async (email, purpose) => {
  const existingOtp = await Otp.findOne({ email, purpose });
  return existingOtp;
};

export const saveOTP = async (email, otp, purpose) => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY); // 5 min

  const otpDoc = await Otp.findOneAndUpdate(
    { email, purpose },
    {
      otp,
      expiresAt,
    },
    {
      new: true,
      upsert: true,
    },
  );

  return otpDoc;
};

export const deleteOtp = async ({ email, purpose }) => {
  return await Otp.deleteMany({ email, purpose });
};
