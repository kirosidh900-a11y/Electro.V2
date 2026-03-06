import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import uploadBrandLogo from "../../config/multer/brandUpload.js";
import {
  brandPage,
  createBrand,
} from "../../controllers/admin/brand.controller.js";



const router = Router();

router
  .route("/")
  .get(isAuth, brandPage)
  .post(isAuth, uploadBrandLogo.single("logo"), createBrand);

export default router;
