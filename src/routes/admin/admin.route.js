import { Router } from "express";
import {
  showLoginPage,
  showForgotPage,
  Login,
  logout,
} from "../../controllers/admin/auth.controller.js";


import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import categoryRouter from "../product/category.route.js";
import brandsRouter from "../product/brand.route.js";
import customersRouter from './customer.route.js'
import dashboardRouter from './dashbord.route.js'

import {
  authAdmin,
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);
//Routes
router.use("/customers", customersRouter);
router.use("/dashboard", dashboardRouter);

router.use("/category", categoryRouter);
router.use("/brand", brandsRouter);

router.route("/").get(authAdmin, showLoginPage).post(Login);

router.get("/forgot", authAdmin, showForgotPage);

router.post("/logout", isAuth, logout);

export default router;
