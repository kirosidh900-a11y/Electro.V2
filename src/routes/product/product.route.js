import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import { productsPage } from "../../controllers/admin/product.controller.js";

const router = Router();

router.route("/").get(isAuth, productsPage);

export default router;
