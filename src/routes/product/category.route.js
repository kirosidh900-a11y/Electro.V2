import { Router } from "express";
import {
  category,
  createCategory,
  editCategory,
  deleteCategory,
  addCategoryAttribute,
  toggleCategoryStatus,
  deleteAttribute,
} from "../../controllers/admin/category.controller.js";

import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

//Get Category page , add category hear
router.route("/").get(isAuth, category).post(isAuth, createCategory);

//Status Update hear
router.patch("/:id/status", isAuth, toggleCategoryStatus);

//edit, delete Category  and add category Attribute hear
router
  .route("/:id")
  .patch(isAuth, editCategory)
  .delete(isAuth, deleteCategory)
  .post(isAuth, addCategoryAttribute);

router.delete("/:id/attribute/:key", isAuth, deleteAttribute);

export default router;
