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
import upload, { validateImageBuffer } from "../../middlewares/cloudinaryUpload.middleware.js";

const router = Router();

router.use(isAuth);

router
  .route("/")
  .get(brandPage)
  .post(setUploadFolder("brands"), upload.single("logo"), validateImageBuffer, createBrand);

router
  .route("/:id")
  .patch(setUploadFolder("brands"), upload.single("logo"), validateImageBuffer, updateBrand)
  .delete(deleteBrand);

router.patch("/status/:id", toggleBrandStatus);

export default router;
