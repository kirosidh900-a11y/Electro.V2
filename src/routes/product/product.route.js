import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";

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
  editVariant,
  addVariantImage,
  deleteVariantImage,
  getProductById,
  getVariantById,
  checkSkuAvailability,
} from "../../controllers/product/product.controller.js";

import { setUploadFolder } from "../../middlewares/setUploadFolder.middleware.js";
import upload from "../../middlewares/cloudinaryUpload.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addVariantSchema } from "../../validations/variant.validation.js";
import { validateVariantImages } from "../../middlewares/imageValidation.middleware.js";

const router = Router();

router.use(isAuth);

// Add and Get Product Hear
router.route("/").get(productsPage).post(createProduct);

// Update and Delete Product & Get Product details page Hear

//Check SKU
router.get("/check-sku", checkSkuAvailability);

router
  .route("/:id")
  .get(getProductDetails)
  .patch(updateProduct)
  .delete(deleteProduct);

// Get attributes for Add product hear
router.get("/:id/attributes", getAttributes);
//Get Product Details for edit product
router.get("/:id/datas", getProductById);

//Products Variant Start hear

// Update Status
router.patch("/:id/status", toggleProductStatus);

// Add , delete and Edit Variant Hear
router.post(
  "/:id/variants",
  setUploadFolder("products"),
  upload.array("images"),
  validate(addVariantSchema),
  validateVariantImages,
  addVariant,
);

router
  .route("/:productId/variants/:variantId")
  .get(getVariantById)
  .patch(editVariant)
  .delete(deleteVariant);

// Img add and delete
router
  .route("/:productId/variants/:variantId/image")
  .post(setUploadFolder("products"), upload.single("image"), addVariantImage)
  .delete(deleteVariantImage);

export default router;
