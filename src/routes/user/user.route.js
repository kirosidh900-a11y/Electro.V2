import { Router } from "express";

import {
  showHomePage,
  profilePage,
  editName,
  editPassword,
  sendEmailOtp,
  updateEamil,
} from "../../controllers/user/user.controller.js";

import attachUser from "../../middlewares/attachUser.middleware.js";
import userAuth from "../../middlewares/user/userAuth.middleware.js";
import { resendOtp } from "../../controllers/user/auth.controller.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

router.get("/", showHomePage);

router.get("/myProfile", userAuth, profilePage);
router.patch("/name", userAuth, editName);
router.route("/email").post(userAuth, sendEmailOtp).patch(userAuth,updateEamil);
router.post('/resend-otp',userAuth,resendOtp)
router.patch("/password", userAuth, editPassword);

export default router;
