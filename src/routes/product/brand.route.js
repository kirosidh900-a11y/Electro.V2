import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import uploadBrandLogo from "../../config/multer/brandUpload.js";
import {
  brandPage,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../../controllers/admin/brand.controller.js";

const router = Router();

router
  .route("/")
  .get(isAuth, brandPage)
  .post(isAuth, uploadBrandLogo.single("logo"), createBrand)

router
  .route("/")
  .get(isAuth, brandPage)
  .post(isAuth, uploadBrandLogo.single("logo"), createBrand);

router
  .route("/:id")
  .patch(isAuth, uploadBrandLogo.single("logo"), updateBrand)
  .delete(isAuth, deleteBrand);

export default router;
