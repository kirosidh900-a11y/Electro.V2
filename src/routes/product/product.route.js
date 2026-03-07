import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  productsPage,
  createProduct,
  updateProduct,
  deleteProduct,
  getAttributes,
  toggleProductStatus
} from "../../controllers/admin/product.controller.js";

const router = Router();

router.route("/").get(isAuth, productsPage).post(isAuth, createProduct);
router.route("/:id").patch(isAuth, updateProduct).delete(isAuth, deleteProduct);
router.get("/:id/attributes", isAuth, getAttributes);
router.patch('/:id/status',isAuth,toggleProductStatus)

export default router;
