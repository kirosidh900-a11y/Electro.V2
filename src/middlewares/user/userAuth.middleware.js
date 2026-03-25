import asyncHandler from "../../utils/partials/asyncHandler.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";
import {verifyUser} from "../../utils/partials/verifyToken.utils.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.cookie("toastError", "User not logged in", { maxAge: 5000 });
    return res.redirect("/auth/login");
  }

  const user = await verifyUser(token);

  if (!user) {
    res.cookie("toastError", "User not found", { maxAge: 5000 });
    return res.redirect("/auth/login");
  }

  if (user.isBlock) {
    clearAuthCookie(res, "token");
    res.cookie("toastError", "Your account is blocked", { maxAge: 5000 });
    return res.redirect("/auth/login");
  }

  req.user = user;
  res.locals.user = user;

  next();
});

export default authMiddleware;
