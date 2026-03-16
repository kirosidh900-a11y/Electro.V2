import { Router } from "express";
import {
  showHomePage,
  profilePage,
} from "../../controllers/user/user.controller.js";
import attachUser from "../../middlewares/attachUser.middleware.js";
import userAuth from "../../middlewares/user/userAuth.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

router.get("/", showHomePage);

router.get("/myProfile", userAuth, profilePage);

export default router;
