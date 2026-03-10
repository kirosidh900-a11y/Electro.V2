import { Router } from "express";
const router = Router();

import {
  showLoginPage,
  Login,
  logout,
  showForgotPage,
} from "../../controllers/admin/auth.controller.js";

import {
  authAdmin,
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

//Admin Login Start Hear
router.route("/").get(authAdmin, showLoginPage).post(Login);
router.post("/logout", isAuth, logout);

router.get("/forgot", authAdmin, showForgotPage);

export default router;
