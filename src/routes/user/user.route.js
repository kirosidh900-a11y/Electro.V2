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
  updateWishlist,
  getCartStatus,
  getWishlistStatus,
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
import {
  validate,
  requireAuth,
} from "../../middlewares/validate.middleware.js";

import {
  cartSchema,
  wishlistSchema,
} from "../../validations/products.validator.js";

import { validateCartBeforeCheckout } from "../../services/product/cart.service.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

//Routes
router.use("/product", productRouter);
router.use("/address", requireAuth, addresRouter);
router.use("/location", requireAuth, locationRoutes);

//Home side
router.get("/", showHomePage);

//Product List page
router.get("/wishlist/status", getWishlistStatus);
router.get("/cart/status", getCartStatus);
router.post("/wishlist", requireAuth, validate(wishlistSchema), updateWishlist);
router.get("/productList", getProductsListingPage);
router.get("/shop", getProductsListingPage);
router
  .route("/cart")
  .get(requireAuth, getCartPage)
  .post(validate(cartSchema), updateCart)
  .patch(updateCartQuantity)
  .delete(removeCartItem);

router.get("/cart/validate-stock", validateCartStock);

router.post("/checkout", validateCartBeforeCheckout, (req, res) => {
  res.status(200).json({ message: "Cart validated. Ready for checkout." });
});

//Profile Side
router.get("/myProfile", userAuth, profilePage);
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
