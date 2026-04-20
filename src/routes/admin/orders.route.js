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
} from "../../controllers/admin/order.controller.js";

router.get("/", isAuth, getAdminOrdersPage);
router.get("/:orderId", isAuth, getAdminOrderDetailsPage);
router.patch("/:orderId/status", isAuth, updateOrderStatus);
router.patch("/:orderId/cancel", isAuth, cancelOrder);
router.patch("/returns/:itemId", handleReturnController);
router.patch("/returns/pickup/:itemId", schedulePickupController);
router.patch("/returns/complete/:itemId", completeReturnController);
router.patch("/items/:itemId/status", isAuth, updateItemStatus);

export default router;
