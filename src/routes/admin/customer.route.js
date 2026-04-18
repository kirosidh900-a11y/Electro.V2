import { Router } from "express";
import {
  customers,
  toggleBlockCustomer,
  getCustomerDetail,
} from "../../controllers/admin/customer.controller.js";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

router.get("/",                    isAuth, customers);
router.get("/:id",                 isAuth, getCustomerDetail);
router.patch("/toggle-block/:id",  isAuth, toggleBlockCustomer);

export default router;
