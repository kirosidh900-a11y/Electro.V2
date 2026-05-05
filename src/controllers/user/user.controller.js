import HTTP_STATUS from "../../constant/statusCode.js";
import { getHomeProductsService } from "../../services/user/home.service.js";
import AppError from "../../utils/partials/AppError.utils.js";
import { successResponse } from "../../utils/partials/response.util.js";
import renderView from "../../utils/admin/renderView.util.js";

import {
  updateNameService,
  updatePasswordService,
  sendEmailOtpService,
  updateEmailService,
  sendPhoneOtpService,
  updatePhoneService,
  updateProfilePhotoService,
  deleteProfilePhotoService,
  getReferralDataService,
} from "../../services/user/user.service.js";

export const showHomePage = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      const products = await getHomeProductsService(limit);

      const cardsHtml = await renderView(
        res,
        "user/home/partials/homeProductCards",
        { products },
      );

      return res.json({ success: true, cards: cardsHtml });
    }

    res.render("user/home/index", { products: undefined });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Failed to load homepage");
  }
};

export const profilePage = async (_req, res, next) => {
  try {
    const { user } = res.locals;
    res.render("user/home/profile", { user });
  } catch (error) {
    next(error);
  }
};

export const editName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { _id: userId } = res.locals.user;

    await updateNameService(userId, name);

    successResponse(res, "Your name is updated successfully!");
  } catch (error) {
    next(error);
  }
};

export const editPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { _id: userId } = res.locals.user;

    await updatePasswordService(userId, currentPassword, newPassword);

    successResponse(res, "Password updated successfully");
  } catch (error) {
    next(error);
  }
};

export const sendEmailOtp = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    const { _id: userId } = res.locals.user;

    await sendEmailOtpService(userId, newEmail);

    successResponse(res, "OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

export const updateEamil = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;
    const { _id: userId } = res.locals.user;

    await updateEmailService(userId, newEmail, otp);

    successResponse(res, "Email successfully updated!");
  } catch (error) {
    next(error);
  }
};

export const sendPhoneOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    await sendPhoneOtpService(phone);

    res.json({ success: true, message: "OTP sent to phone" });
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const { _id: userId } = res.locals.user;

    await updatePhoneService(userId, phone, otp);

    res.json({ success: true, message: "Phone updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "No file uploaded" });
    }

    const { _id: userId } = res.locals.user;

    const photoUrl = await updateProfilePhotoService(userId, req.file.buffer);

    res.json({ success: true, photo: photoUrl });
  } catch (error) {
    next(error);
  }
};

export const deleteProfilePhoto = async (req, res, next) => {
  try {
    const { _id: userId } = res.locals.user;

    if (!userId) {
      return next(new AppError("User not found", HTTP_STATUS.UNAUTHORIZED));
    }

    await deleteProfilePhotoService(userId);

    res.json({ success: true, message: "Photo removed" });
  } catch (error) {
    next(error);
  }
};

export const getReferralPage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const data = await getReferralDataService(userId);

    return res.render("user/home/referral", {
      user: req.user,
      referralCode: data.referralCode,
      referralCount: data.referralCount,
      maxReferrals: 6,
      bonusAmount: 500,      // referrer reward
      refereeBonus: 200,     // new member reward
      currentRoute: "/referral",
    });
  } catch (err) {
    next(err);
  }
};
