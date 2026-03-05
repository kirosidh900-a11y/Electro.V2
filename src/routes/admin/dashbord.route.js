import { Router } from "express";
import {
  dashboard,
} from "../../controllers/admin/admin.controller.js";

import {
  isAuth,
} from "../../middlewares/admin/authAdmin.middleware.js";

const router = Router();

//Dashboard Routes
router.get("/", isAuth, dashboard);

export default router;
