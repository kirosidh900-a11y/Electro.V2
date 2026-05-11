import { Router } from "express";
const router = Router();
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  getReturnRequestsPage,
  handleReturnController,
  schedulePickupController,
  completeReturnController,
} from "../../controllers/admin/order.controller.js";

// GET /admin/returns  — returns management page
router.get("/", isAuth, getReturnRequestsPage);

// PATCH /admin/returns/pickup/:itemId  — must come BEFORE /:itemId to avoid conflict
router.patch("/pickup/:itemId",   isAuth, schedulePickupController);
router.patch("/complete/:itemId", isAuth, completeReturnController);

// PATCH /admin/returns/:itemId  — approve / reject
router.patch("/:itemId", isAuth, handleReturnController);

export default router;
