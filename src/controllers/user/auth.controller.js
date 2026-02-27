import { Router } from "express";
import {
  showLoginPage,
  showSignUpPage,
} from "../../services/user/auth.service.js";

const router = Router();
router.get("/login", showLoginPage);

router.get("/signup", showSignUpPage);

export default router;
