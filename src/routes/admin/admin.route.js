import { Router } from "express";
import {
  showLoginPage,
  showForgotPage,
  Login,
  logout,
} from "../../controllers/admin/auth.controller.js";
import {
  dashboard,
  customers,
  toggleBlockCustomer,
  category,
  createCategory,
  toggleCategoryStatus
} from "../../controllers/admin/admin.controller.js";

import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import categoryRouter from '../product/category.route.js'

import {
  authAdmin,
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);
//Routes
router.use("/category", categoryRouter);

router.route("/").get(authAdmin, showLoginPage).post(Login);

router.get("/forgot", authAdmin, showForgotPage);

router.post("/logout", isAuth, logout);

//Dashboard Routes
router.get("/dashboard", isAuth, dashboard);

//Customers
router.get("/customers", isAuth, customers);
router.patch("/toggle-block/:id", isAuth, toggleBlockCustomer);

export default router;
