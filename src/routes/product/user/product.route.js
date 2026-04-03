import { Router } from "express";
import { getProductDetailsUser } from "../../../controllers/product/user/product.controller.js";

const router = Router();


router.get("/:id", getProductDetailsUser);


export default router;
 