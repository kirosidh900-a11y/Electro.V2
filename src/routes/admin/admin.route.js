import { Router } from "express";
import {
  showLoginPage,
  //showForgotPage,
  Login,
  logout,
} from "../../controllers/admin/auth.controller.js";

import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import categoryRouter from "../product/category.route.js";
import brandsRouter from "../product/brand.route.js";
import productsRouter from '../product/product.route.js'
import customersRouter from "./customer.route.js";
import dashboardRouter from "./dashbord.route.js";

import {
  authAdmin,
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);

//Routes
router.use("/customers", isAuth, customersRouter);
router.use("/dashboard", isAuth, dashboardRouter);
router.use("/category", isAuth, categoryRouter);
router.use("/brand", isAuth, brandsRouter);
router.use("/products", isAuth,productsRouter);

//Admin Login Start Hear
router.route("/").get(authAdmin, showLoginPage).post(Login);
router.post("/logout", isAuth, logout);

// router.get("/forgot", authAdmin, showForgotPage);

export default router;
