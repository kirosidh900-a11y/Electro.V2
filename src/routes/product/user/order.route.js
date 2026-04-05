import { Router } from "express";
import { getOrderSuccessPage, placeOrder } from "../../../controllers/user/order.controller.js";

const router = Router();


router.post("/place", placeOrder);
router.get("/success/:orderId", getOrderSuccessPage)

export default router;