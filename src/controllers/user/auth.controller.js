import HTTP_STATUS from "../../constant/statusCode.js";
import { isValidate, addUser } from "../../services/user/auth.service.js";
import { sendOtpToEmail, otpExist ,generateOTP } from "../../utils/auth.utils.js";
import AppError from "../../utils/AppError.js";
import Otp from "../../models/otp.model.js";
import { sendEmail } from "../../constant/transporter.js";


export const showLoginPage = (req, res) => {
  res.render("user/auth/login");
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

    await Otp.deleteMany({ email, purpose: "signup" });

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
    const { email } = req.body;

    const otpDoc = await Otp.findOne({ email, purpose: "signup" });

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

    await sendEmail({ email, name: otpDoc.tempUserData.name, otp: newOtp });

    console.log(`Resent OTP ${newOtp} to ${email}`);

    res.json({
      success: true,
      message: "OTP resent successfully",
    });

  } catch (err) {
    next(err);
  }
};