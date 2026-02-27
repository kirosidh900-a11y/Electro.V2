import { Router } from "express";       
import { showLoginPage } from "../../controllers/user/auth.controller.js";

const router = Router();
router.get('/login', showLoginPage);

export default router;