import { Router } from "express";
import {
  category,
  createCategory,
  editCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../../controllers/admin/admin.controller.js";

import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

router.use(adminAuth);

router.route("/").get(isAuth, category).post(isAuth, createCategory);

router.patch("/:id/status", isAuth, toggleCategoryStatus);
router.route("/:id").patch(isAuth, editCategory).delete(isAuth, deleteCategory);

export default router;
