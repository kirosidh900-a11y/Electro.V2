import { Router } from "express";
import {
  showLoginPage,
  showForgotPage,
  Login,
  logout,
} from "../../controllers/admin/auth.controller.js";
import {
  dashboard,
  customers
} from '../../controllers/admin/admin.controller.js'

import adminAuth from "../../middlewares/attachAdmin.middleware.js";
import {authAdmin ,isAuth} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);

router.route("/").get(authAdmin, showLoginPage).post(Login);

router.get("/forgot", authAdmin, showForgotPage);

router.post('/logout',isAuth , logout)

router.get("/dashboard", isAuth, dashboard);
router.get("/customers", isAuth, customers);

export default router;
