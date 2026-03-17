import HTTP_STATUS from "../../constant/statusCode.js";
import sendEmail from "../../constant/transporter.js";
import Products from "../../models/productSchema.model.js";
import {
  findOtp,
  otpExist,
  saveOTP,
  sendOtpToEmail,
} from "../../services/partials/otp.service.js";
import {
  findUserByEmail,
  findUserById,
  isUserExist,
} from "../../services/user/auth.service.js";

import AppError from "../../utils/partials/AppError.utils.js";
import {
  hashPassword,
  verifyPassword,
} from "../../utils/partials/auth/password.utils.js";
import generateOTP from "../../utils/partials/otpGenerater.js";
import { successResponse } from "../../utils/partials/response.util.js";

export const showHomePage = async (req, res) => {
  try {
    const products = await Products.find({
      status: "listed",
      isDeleted: false,
    })
      .populate("brand", "title")
      .populate("category", "title")
      .lean();

    const formattedProducts = products.map((product) => {
      const variant = product.variants?.find((v) => !v.isDeleted);

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand?.title,
        category: product.category?.title,
        price: variant?.price || 0,
        stock: variant?.stock || 0,
        image: variant?.product_image?.[0] || null,
      };
    });

    res.render("user/home/index", {
      products: formattedProducts,
    });
  } catch (error) {
    console.error("show home page Error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send("Failed to load homepage");
  }
};

export const profilePage = async (req, res, next) => {
  try {
    res.render("user/home/profile");
  } catch (error) {
    console.error("Profile Page Error:", error);
    next(error);
  }
};

export const editName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await findUserById(res.locals.user._id);

    if (!user) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }
    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!namePattern.test(name)) {
      throw new AppError("Name is invalid format!", HTTP_STATUS.BAD_REQUEST);
    }

    user.name = name;
    await user.save();

    const message = "Your name is updated successfully!";
    successResponse(res, message);
  } catch (error) {
    console.error("Profile Page Error:", error);
    next(error);
  }
};

export const editPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordPattern.test(newPassword)) {
      throw new AppError(
        "Password must be 8+ chars, include uppercase, lowercase, number & special character",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const user = await findUserById(res.locals.user._id, true);

    if (!user) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    // If already has password → verify current
    if (user.password) {
      const isMatch = await verifyPassword(currentPassword, user.password);

      if (!isMatch) {
        throw new AppError(
          "Current password is incorrect",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    user.password = await hashPassword(newPassword);

    await user.save();

    const message = "Password updated successfully";
    successResponse(res, message);
  } catch (error) {
    next(error);
  }
};

export const sendEmailOtp = async (req, res, next) => {
  try {
    const { newEmail } = req.body;

    const existing = await findUserByEmail(newEmail);

    if (existing) {
      throw new AppError("Email already in use", 400);
    }

    const otp = generateOTP();

    // Save OTP Redis
    await saveOTP(newEmail, otp, "reset-email");

    const name = res.locals.user?.name;

    // send mail
    await sendEmail({ email: newEmail, name, otp });

    successResponse(res, "OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

export const updateEamil = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;

    const [userData, isExist, user] = await Promise.all([
      otpExist(newEmail, otp, "reset-email"),
      isUserExist(newEmail),
      findUserById(res.locals.user._id, true),
    ]);

    if (!userData) {
      throw new AppError(
        "Session is Expired or Invalid OTP, Try again",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    user.email = newEmail;
    user.save();
    successResponse(res,"Email successfully updated!")
  } catch (error) {
    console.error("Email update error", error);
    next(error);
  }
};
