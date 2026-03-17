import redisClient from "../../utils/partials/redisClient.util.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import sendEmail from "../../constant/transporter.js";
import { hashPassword } from "../../utils/partials/auth/password.utils.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import { OTP_EXPIRY } from "../../constant/auth.constant.js";

/* ================= SEND OTP ================= */

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
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const otp = generateOTP();

  const finalPassword = password.startsWith("$argon2")
    ? password
    : await hashPassword(password);

  const key = `otp:signup:${email}`;

  const data = JSON.stringify({
    otp,
    tempUserData: {
      name,
      phone,
      password: finalPassword,
      referral_by,
    },
  });

  await redisClient.set(key, data, {
    EX: OTP_EXPIRY / 1000,
  });

  await sendEmail({ email, name, otp });

  console.warn(`[Service] OTP ${otp} generated for ${email}`);
};

/* ================= VERIFY OTP ================= */

export const otpExist = async (email, otp, purpose) => {
  const key = `otp:${purpose}:${email}`;

  const stored = await redisClient.get(key);

  if (!stored) return null;

  const parsed = JSON.parse(stored);

  if (String(parsed.otp) !== String(otp)) return null;

  return parsed;
};
/* ================= FIND OTP ================= */

export const findOtp = async (email, purpose) => {
  const key = `otp:${purpose}:${email}`;

  const stored = await redisClient.get(key);

  if (!stored) return null;

  return JSON.parse(stored);
};

/* ================= RESEND OTP ================= */

export const saveOTP = async (email, otp, purpose, tempUserData = null) => {
  const key = `otp:${purpose}:${email}`;

  const data = JSON.stringify({
    otp,
    tempUserData,
  });

  await redisClient.set(key, data, {
    EX: OTP_EXPIRY / 1000,
  });
};

/* ================= DELETE OTP ================= */

export const deleteOtp = async ({ email, purpose }) => {
  const key = `otp:${purpose}:${email}`;

  await redisClient.del(key);
};
