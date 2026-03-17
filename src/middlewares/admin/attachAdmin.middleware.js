import { adminMenu } from "../../config/adminMenu.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";
import verifyUser from "../../utils/partials/verifyToken.utils.js";

const adminAuth = async (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return next();
  }

  try {
    const admin = await verifyUser(token);

    if (!admin || !admin.isAdmin || admin.isBlock) {
      res.locals.admin = null;
      res.locals.menu = null;
      res.locals.currentPath = null;
      clearAuthCookie(res, "adminToken");

      return res.redirect("/admin");
    }

    req.admin = admin;

    res.locals.admin = admin;
    res.locals.menu = adminMenu;
    res.locals.currentPath = req.originalUrl;

    next();
  } catch (err) {
    console.error("AdminAuth Error:", err);
    clearAuthCookie(res, "adminToken");
    res.locals.admin = null;
    res.locals.menu = null;
    res.locals.currentPath = null;
    return res.redirect("/admin");
  }
};

export default adminAuth;
