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
  .post(requireAuth, validate(wishlistSchema), updateWishlist)
  .delete(requireAuth, validate(wishlistSchema), updateWishlist);

  
router.get("/status", getWishlistStatus);

export default router;
