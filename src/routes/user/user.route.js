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
import upload from "../../middlewares/cloudinaryUpload.middleware.js";
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
  validateCartStockCheck,
} from "../../controllers/product/user/checkout.controller.js";
import { getOrderListingPage } from "../../controllers/user/order.controller.js";
import paymentRouter from "../product/payment.route.js";
import { applyCoupon, removeCoupon } from "../../controllers/product/user/coupon.controller.js";

import { getWalletPage, addMoneyToWallet } from "../../controllers/user/wallet.controller.js";

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
router.use("/payment", requireAuth, paymentRouter);

//Home side
router.get("/", showHomePage);

// Demo route for payment modals (development only)
router.get("/demo/payment-modals", (req, res) => {
  res.render("demo/payment-modals");
});

//Product List page
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
router.post("/cart/coupon/apply",  requireAuth, applyCoupon);
router.delete("/cart/coupon/remove", requireAuth, removeCoupon);

//Profile Side
router.get("/myProfile", userAuth, profilePage);
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
  .patch(setUploadFolder("profile"), upload.single("photo"), updateProfilePhoto)
  .delete(deleteProfilePhoto);

export default router;
