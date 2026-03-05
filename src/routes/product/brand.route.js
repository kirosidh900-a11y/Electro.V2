import { Router } from "express";
import { brandPage } from "../../controllers/admin/brand.controller.js";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

router.get("/", isAuth, brandPage);

export default router;
