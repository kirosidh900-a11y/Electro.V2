import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  productsPage,
  createProduct,
  updateProduct,
} from "../../controllers/admin/product.controller.js";

const router = Router();

router.route("/").get(isAuth, productsPage).post(isAuth, createProduct);
router.route("/:id").patch(isAuth, updateProduct);

export default router;
