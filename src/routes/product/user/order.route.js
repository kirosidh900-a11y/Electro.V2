import { Router } from "express";
import {
  getOrderDetailsPage,
  getOrderSuccessPage,
  getOrderFailurePage,
  placeOrder,
  cancelOrder,
  returnOrderItem,
  getOrderListingPage,
} from "../../../controllers/user/order.controller.js";

const router = Router();

router.get('/', getOrderListingPage);
router.post("/place", placeOrder);
router.get("/success/:orderId", getOrderSuccessPage);
router.get("/failure/:orderId", getOrderFailurePage);
router.get("/details/:orderId", getOrderDetailsPage);
router.patch("/:orderId/item/:itemId/cancel", cancelOrder);
router.patch("/:orderId/cancel", cancelOrder);
router.patch("/:orderItemId/return", returnOrderItem);


export default router;