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
} from "../../controllers/admin/admin.controller.js";

import adminAuth from "../../middlewares/admin/attachAdmin.middleware.js";
import {
  authAdmin,
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(adminAuth);

router.route("/").get(authAdmin, showLoginPage).post(Login);

router.get("/forgot", authAdmin, showForgotPage);

router.post("/logout", isAuth, logout);


//Dashboard Routes

router.get("/dashboard", isAuth, dashboard);
//Customers
router.get("/customers", isAuth, customers);
router.patch("/toggle-block/:id", isAuth, toggleBlockCustomer);
//category 
router.get('/category',category)
router.post("/category", createCategory);

export default router;
