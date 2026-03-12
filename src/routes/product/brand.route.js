import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  brandPage,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
} from "../../controllers/product/brand.controller.js";
import { setUploadFolder } from "../../middlewares/setUploadFolder.middleware.js";
import upload from "../../middlewares/cloudinaryUpload.middleware.js";

const router = Router();

router
  .route("/")
  .get(isAuth, brandPage)
  .post(isAuth, setUploadFolder("brands"), upload.single("logo"), createBrand);

router
  .route("/:id")
  .patch(isAuth, setUploadFolder("brands"), upload.single("logo"), updateBrand)
  .delete(isAuth, deleteBrand);

router.patch("/status/:id", isAuth, toggleBrandStatus);

export default router;
