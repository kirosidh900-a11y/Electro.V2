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

export default router;