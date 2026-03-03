import Otp from "../../models/otp.model.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import sendEmail from "../../constant/transporter.js";
import {hashedPassword} from "../../utils/partials/hashHelper.utils.js";

// Send OTP Thought Clinet
export const sendOtpToEmail = async ({
  email,
  name,
  phone,
  password,
  referral_by,
}) => {

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const otp = generateOTP();

  const finalPassword = password.startsWith("$argon2")
    ? password
    : await hashedPassword(password);

    console.log(typeof referral_by , referral_by)

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
