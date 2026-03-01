import { Router } from "express";
import { showLoginPage,showForgotPage } from "../../controllers/admin/auth.controller.js";

const router = Router();

router.get('/', showLoginPage);
router.get('/forgot',showForgotPage)

export default router;
