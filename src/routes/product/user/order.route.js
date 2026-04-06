import { Router } from "express";
import {
  getOrderDetailsPage,
  getOrderSuccessPage,
  placeOrder,
  cancelOrder,
  returnOrderItem,
} from "../../../controllers/user/order.controller.js";

const router = Router();

router.post("/place", placeOrder);
router.get("/success/:orderId", getOrderSuccessPage);
router.get("/details/:orderItemId", getOrderDetailsPage);
router.patch("/:orderId/cancel", cancelOrder);
router.patch("/:orderItemId/return", returnOrderItem);

export default router;