import jwt from "jsonwebtoken";
import User from "../../models/userSchema.model.js";
import { adminMenu } from "../../config/adminMenu.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";

const adminAuth = async (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id).select("-password -googleId");

    if (!admin || !admin.isAdmin || admin.isBlock) {
      res.locals.admin = null;
      res.locals.menu = null;
      res.locals.currentPath = null;
      clearAuthCookie(res, "adminToken");

      return res.redirect("/admin"); // better than next()
    }

    req.admin = admin;

    res.locals.admin = admin;
    res.locals.menu = adminMenu;
    res.locals.currentPath = req.originalUrl;

    next();
  } catch (err) {
    console.log("AdminAuth Error:", err);
    clearAuthCookie(res, "adminToken");
    res.locals.admin = null;
    res.locals.menu = null;
    res.locals.currentPath = null;
    return res.redirect("/admin");
  }
};

export default adminAuth;
