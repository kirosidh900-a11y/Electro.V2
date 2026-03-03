import { Router } from "express";
import {
  showLoginPage,
  showForgotPage,
  Login,
} from "../../controllers/admin/auth.controller.js";

import adminAuth from "../../middlewares/attachAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);

router.route("/").get(showLoginPage).post(Login);

router.get("/forgot", showForgotPage);
router.get("/dashboard", (req, res) => {
  res.render("admin/home/dashboard");
});

export default router;
