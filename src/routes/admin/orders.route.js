import { Router } from "express";
const router = Router();
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  getAdminOrdersPage,
  getAdminOrderDetailsPage,
  updateOrderStatus,
  cancelOrder,
} from "../../controllers/admin/order.controller.js";

router.get("/", isAuth, getAdminOrdersPage);
router.get("/:orderId", isAuth, getAdminOrderDetailsPage);
router.patch("/:orderId/status", isAuth, updateOrderStatus);
router.patch("/:orderId/cancel", isAuth, cancelOrder);

export default router;
