import { Router } from "express";
const router = Router();
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  getAdminOrdersPage,
  getAdminOrderDetailsPage,
  updateOrderStatus,
  cancelOrder,
  handleReturnController,
  schedulePickupController,
  completeReturnController,
  updateItemStatus,
  processItemRefundController,
  getReturnRequestsPage,
} from "../../controllers/admin/order.controller.js";

router.get("/", isAuth, getAdminOrdersPage);

// ── Returns management page ──
router.get("/returns", isAuth, getReturnRequestsPage);

// ── Specific routes BEFORE /:orderId param ──
router.patch("/returns/:itemId",          isAuth, handleReturnController);
router.patch("/returns/pickup/:itemId",   isAuth, schedulePickupController);
router.patch("/returns/complete/:itemId", isAuth, completeReturnController);
router.patch("/items/:itemId/status",     isAuth, updateItemStatus);
router.post("/items/:itemId/refund",      isAuth, processItemRefundController);

// ── Parameterized order routes ──
router.get("/:orderId",           isAuth, getAdminOrderDetailsPage);
router.patch("/:orderId/status",  isAuth, updateOrderStatus);
router.patch("/:orderId/cancel",  isAuth, cancelOrder);

export default router;
