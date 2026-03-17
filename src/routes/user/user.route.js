import { Router } from "express";

import {
  showHomePage,
  profilePage,
  editName,
  editPassword,
} from "../../controllers/user/user.controller.js";

import attachUser from "../../middlewares/attachUser.middleware.js";
import userAuth from "../../middlewares/user/userAuth.middleware.js";

const router = Router();

// Prevent caching of protected pages
router.use(attachUser);

router.get("/", showHomePage);

router.get("/myProfile", userAuth, profilePage);
router.patch("/name", userAuth, editName);
router.patch("/password", userAuth, editPassword);

export default router;
