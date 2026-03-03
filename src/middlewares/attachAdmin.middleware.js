import jwt from "jsonwebtoken";
import User from "../models/userSchema.model.js";

 const adminAuth = async (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);

    if (!admin || !admin.isAdmin || admin.isBlock) {
      res.clearCookie("adminToken", { path: "/admin" });
      return next()
    }

    req.admin = admin;
    next();
  } catch (err) {
    res.clearCookie("adminToken", { path: "/admin" });
    return res.redirect("/admin");
  }
};

export default adminAuth
