import { Router } from "express";
const router = Router();
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import { getAdminOrdersPage } from "../../controllers/admin/order.controller.js";

router.get("/", isAuth, getAdminOrdersPage);

// 🔥 ORDER DETAILS (NEXT STEP)
router.get("/:orderId", isAuth, (req, res) => {
  res.send("Order Details Page");
});

export default router;
