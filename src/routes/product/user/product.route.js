import { Router } from "express";
import attachUser from "../../../middlewares/attachUser.middleware.js";
import { getProductDetailsUser } from "../../../controllers/product/user/product.controller.js";

const router = Router();

router.use(attachUser);

router.get("/:id", getProductDetailsUser);


export default router;
