import HTTP_STATUS from "../../constant/statusCode.js";
import sendEmail from "../../constant/transporter.js";
import { sendSMS } from "../../services/partials/sms.service.js";

import { otpExist, saveOTP } from "../../services/partials/otp.service.js";

import {
  findUserByEmail,
  findUserById,
  isUserExist,
} from "../../services/user/auth.service.js";

import { getHomeProductsService } from "../../services/user/home.service.js";

import AppError from "../../utils/partials/AppError.utils.js";

import {
  hashPassword,
  verifyPassword,
} from "../../utils/partials/auth/password.utils.js";

import generateOTP from "../../utils/partials/otpGenerater.js";
import { successResponse } from "../../utils/partials/response.util.js";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../../services/partials/cloudinary.service.js";

import renderView from "../../utils/admin/renderView.util.js";

export const showHomePage = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    // --- AJAX / API RESPONSE ---
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      const products = await getHomeProductsService(limit);

      const cardsHtml = await renderView(
        res,
        "user/home/partials/homeProductCards",
        { products },
      );

      return res.json({
        success: true,
        cards: cardsHtml,
      });
    }

    res.render("user/home/index", { products: undefined });
  } catch (error) {
    console.error("Home page error:", error);

    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send("Failed to load homepage");
  }
};

//Profile page loder
export const profilePage = async (req, res, next) => {
  try {
    const { user } = res.locals;
    res.render("user/home/profile", { user });
  } catch (error) {
    console.error("Profile Page Error:", error);
    next(error);
  }
};

//Name Update
export const editName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { _id: userId } = res.locals.user;

    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!namePattern.test(name)) {
      throw new AppError("Name is invalid format!", HTTP_STATUS.BAD_REQUEST);
    }

    if (!userId) {
      return next(
        new AppError("Unauthorized: Please log in", HTTP_STATUS.UNAUTHORIZED),
      );
    }

    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
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

//Password Edit
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

    const { _id: userId } = res.locals.user;

    const user = await findUserById(userId, true);

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

//Email Update
export const sendEmailOtp = async (req, res, next) => {
  try {
    const { newEmail } = req.body;

    const existing = await findUserByEmail(newEmail);

    if (existing) {
      return next(
        new AppError("Email already in use", HTTP_STATUS.BAD_REQUEST),
      );
    }

    const otp = generateOTP();

    // Save OTP Redis
    await saveOTP(newEmail, otp, "reset-email");

    const { name } = res.locals.user;

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

    const { _id } = res.locals.user;

    const [userData, , user] = await Promise.all([
      otpExist(newEmail, otp, "reset-email"),
      isUserExist(newEmail),
      findUserById(_id),
    ]);

    if (!userData) {
      throw new AppError(
        "Session is Expired or Invalid OTP, Try again",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    user.email = newEmail;
    user.save();
    successResponse(res, "Email successfully updated!");
  } catch (error) {
    console.error("Email update error", error);
    next(error);
  }
};

// Phone Number Update
export const sendPhoneOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throw new AppError("Phone is required", 400);
    }

    const otp = generateOTP();

    await saveOTP(phone, otp, "reset-phone");

    // Send SMS
    await sendSMS({
      phone,
      message: `Your OTP is ${otp}. Do not share it.`,
    });

    res.json({
      success: true,
      message: "OTP sent to phone",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      throw new AppError("Phone and OTP required", HTTP_STATUS.BAD_REQUEST);
    }

    const isValid = await otpExist(phone, otp, "reset-phone");

    if (!isValid) {
      throw new AppError("Invalid or expired OTP", HTTP_STATUS.BAD_REQUEST);
    }

    const { _id: userId } = res.locals.user;

    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // NOW update phone (after OTP)
    user.phone = phone;
    await user.save();

    res.json({
      success: true,
      message: "Phone updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

//Profile photo
export const updateProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { _id: userId } = res.locals.user;

    const user = await findUserById(userId);

    // DELETE OLD PHOTO IF EXISTS
    if (user?.photoId) {
      await deleteFromCloudinary(user?.photoId);
    }

    // Upload using stream
    const result = await uploadToCloudinary(req.file.buffer, "profile");

    // Save URL to DB
    user.photo = result.secure_url;
    user.photoId = result.public_id;

    await user.save();

    res.json({
      success: true,
      photo: result.secure_url,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfilePhoto = async (req, res, next) => {
  try {
    const { _id: userId } = res.locals.user;

    if (!userId) {
      return next(new AppError("User not found", 401));
    }

    const user = await findUserById(userId);

    if (!user || !user.photoId) {
      throw new AppError("No photo found", HTTP_STATUS.BAD_REQUEST);
    }

    // 🔥 Delete from Cloudinary
    await deleteFromCloudinary(user.photoId);

    user.photo = null;
    user.photoId = null;

    await user.save();

    res.json({
      success: true,
      message: "Photo removed",
    });
  } catch (error) {
    next(error);
  }
};
