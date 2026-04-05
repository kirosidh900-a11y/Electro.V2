import { Router } from "express";
import { placeOrder } from "../../controllers/user/order.controller.js";

const router = Router();


router.post("/place", placeOrder);

export default router;