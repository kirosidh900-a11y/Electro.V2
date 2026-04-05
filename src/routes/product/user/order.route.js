import { Router } from "express";
import { getOrderDetailsPage, getOrderSuccessPage, placeOrder } from "../../../controllers/user/order.controller.js";

const router = Router();


router.post("/place", placeOrder);
router.get("/success/:orderId", getOrderSuccessPage)
router.get("/details/:orderId", getOrderDetailsPage);

export default router;