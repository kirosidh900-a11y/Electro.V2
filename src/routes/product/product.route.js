import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import pImgUpload from "../../config/multer/productUpload.js";

import {
  productsPage,
  createProduct,
  updateProduct,
  deleteProduct,
  getAttributes,
  toggleProductStatus,
  getProductDetails,
  addVariant,
  deleteVariant,
  addVariantImage,
  deleteVariantImage,
} from "../../controllers/admin/product.controller.js";

const router = Router();

// Add and Get Product Hear
router.route("/").get(isAuth, productsPage).post(isAuth, createProduct);

// Update and Delete Product & Get Product details page Hear
router
  .route("/:id")
  .get(isAuth, getProductDetails)
  .patch(isAuth, updateProduct)
  .delete(isAuth, deleteProduct);

// Get attributes for Add product hear
router.get("/:id/attributes", isAuth, getAttributes);

// Update Status
router.patch("/:id/status", isAuth, toggleProductStatus);

// Add , delete and Edit Variant Hear
router.post("/:id/variants", addVariant);
router.delete("/:productId/variants/:variantId", deleteVariant);


// Img add and delete
router
  .route("/:productId/variants/:variantId/image")
  .post(isAuth, pImgUpload.single("image"), addVariantImage)
  .delete(isAuth, deleteVariantImage);



export default router;
