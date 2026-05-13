import { Router } from "express";

import {
  showHomePage,
  profilePage,
  editName,
  editPassword,
  sendEmailOtp,
  updateEamil,
  sendPhoneOtp,
  verifyPhoneOtp,
  deleteProfilePhoto,
  updateProfilePhoto,
  getReferralPage,
} from "../../controllers/user/user.controller.js";

import {
  getProductsListingPage,
  updateCart,
  getCartStatus,
  getCartPage,
  updateCartQuantity,
  removeCartItem,
  validateCartStock,
} from "../../controllers/product/user/product.controller.js";
import { resendOtp } from "../../controllers/user/auth.controller.js";
import { setUploadFolder } from "../../middlewares/setUploadFolder.middleware.js";

import attachUser from "../../middlewares/attachUser.middleware.js";
import userAuth from "../../middlewares/user/userAuth.middleware.js";
import addresRouter from "./addres.route.js";
import upload, { validateImageBuffer } from "../../middlewares/cloudinaryUpload.middleware.js";
import locationRoutes from "./location.route.js";
import productRouter from "../../routes/product/user/product.route.js";
import wishlistRouter from "./wishlist.route.js";
import orderRouter from "../product/user/order.route.js";

import {
  validate,
  requireAuth,
} from "../../middlewares/validate.middleware.js";

import { cartSchema } from "../../validations/products.validator.js";

import {
  getCheckoutPage,
  getBuyNowPage,
  validateCartStockCheck,
} from "../../controllers/product/user/checkout.controller.js";
import { getOrderListingPage } from "../../controllers/user/order.controller.js";
import paymentRouter from "../product/payment.route.js";
import { razorpayCallbackController } from "../../controllers/product/payment.controller.js";
import { applyCoupon, removeCoupon, getAvailableCoupons } from "../../controllers/product/user/coupon.controller.js";

import { getWalletPage, addMoneyToWallet } from "../../controllers/user/wallet.controller.js";
import User from "../../models/userSchema.model.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

//Routes
router.use("/product", productRouter);
router.use("/address", requireAuth, addresRouter);
router.use("/location", requireAuth, locationRoutes);
router.use("/wishlist", requireAuth, wishlistRouter);
router.use("/orders", requireAuth, orderRouter);
router.use("/order", requireAuth, orderRouter);

// Razorpay redirect callback — no auth required (Razorpay POSTs here directly)
// Must be registered BEFORE the requireAuth payment router to bypass auth
router.post("/payment/callback", razorpayCallbackController);
router.use("/payment", requireAuth, paymentRouter);

//Home side
router.get("/", showHomePage);

// Demo route for payment modals (development only)
router.get("/demo/payment-modals", (req, res) => {
  res.render("demo/payment-modals");
});

router.get("/cart/status", getCartStatus);

router.get("/productList", getProductsListingPage);
router.get("/shop", getProductsListingPage);

router
  .route("/cart")
  .get(requireAuth, getCartPage)
  .post(requireAuth, validate(cartSchema), updateCart)
  .patch(requireAuth, updateCartQuantity)
  .delete(requireAuth, removeCartItem);

router.get("/cart/validate-stock", requireAuth, validateCartStock);
router.get("/cart/validate-stock-cart", requireAuth, validateCartStockCheck);
router.get("/cart/checkout", requireAuth, getCheckoutPage);
router.get("/checkout", requireAuth, getBuyNowPage);
router.get("/cart/coupon/available", requireAuth, getAvailableCoupons);
router.post("/cart/coupon/apply", requireAuth, applyCoupon);
router.delete("/cart/coupon/remove", requireAuth, removeCoupon);

//Profile Side
router.get("/myProfile", userAuth, profilePage);
router.get("/referral", userAuth, getReferralPage);
router.get("/wallet", userAuth, getWalletPage);
router.post("/wallet/add", userAuth, addMoneyToWallet);
router.patch("/name", userAuth, editName);

router
  .route("/email")
  .post(userAuth, sendEmailOtp)
  .patch(userAuth, updateEamil);

router.post("/resend-otp", userAuth, resendOtp);
router.patch("/password", userAuth, editPassword);

router
  .route("/phone")
  .post(userAuth, sendPhoneOtp)
  .patch(userAuth, verifyPhoneOtp);

router
  .route("/photo")
  .patch(setUploadFolder("profile"), upload.single("photo"), validateImageBuffer, updateProfilePhoto)
  .delete(deleteProfilePhoto);

export default router;
