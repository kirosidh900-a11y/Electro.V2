import { Router } from "express";
import {
  customers,
  toggleBlockCustomer,
} from "../../controllers/admin/customer.controller.js";

import {
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

//Customers
router.get("/", isAuth, customers);
router.patch("/toggle-block/:id", isAuth, toggleBlockCustomer);

export default router;
