import { Router } from "express";
import {
  getWishlistPage,
  getWishlistStatus,
  updateWishlist,
} from "../../controllers/product/user/product.controller.js";
import {
  requireAuth,
  validate,
} from "../../middlewares/validate.middleware.js";
import { wishlistSchema } from "../../validations/products.validator.js";
const router = Router();

router
  .route("/")
  .get(getWishlistPage)
  .post(requireAuth, validate(wishlistSchema), updateWishlist);

router.delete("/", requireAuth, (req, res, next) => {
  try {
    const { productId, variantId } = req.body;
    const userId = res.locals.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("Removing from wishlist:", { userId, productId, variantId });
    res
      .status(200)
      .json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    console.error("Error in DELETE /wishlist:", err);
    next(err);
  }
});
// removeWishlist moveToCart
router.post("/move-to-cart", requireAuth, (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const userId = res.locals.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("Moving to cart:", { userId, productId, variantId });
    res.status(200).json({ success: true, message: "Item moved to cart" });
  } catch (err) {
    console.error("Error in POST /wishlist/move-to-cart:", err);
    next(err);
  }
});

router.get("/status", getWishlistStatus);

export default router;
