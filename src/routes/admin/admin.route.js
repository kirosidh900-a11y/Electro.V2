import { Router } from "express";

import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import categoryRouter from "../product/category.route.js";
import brandsRouter from "../product/brand.route.js";
import productsRouter from "../product/product.route.js";
import customersRouter from "./customer.route.js";
import dashboardRouter from "./dashbord.route.js";
import authRouter from "./auth.route.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);



//Routes
router.use("/customers", customersRouter);
router.use("/dashboard", dashboardRouter);
router.use("/category", categoryRouter);
router.use("/brand", brandsRouter);
router.use("/products", productsRouter);
router.use("/", authRouter);

export default router;
