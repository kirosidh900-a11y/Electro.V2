import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import { getCouponsPage } from "../../controllers/admin/coupon.controller.js";

const router = Router();

router.get("/", isAuth, getCouponsPage);

export default router;
