import {Router} from "express";
import { showHomePage ,verifyOTP } from "../../controllers/user/user.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", showHomePage)
router.post('/verify-otp', verifyOTP);
router.get("/myProfile", authMiddleware, async (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

export default router;