import jwt from "jsonwebtoken";
import { getUserData } from "../services/user/user.service.js";
import clearAuthCookie from "../utils/partials/clearCookie.js";

const attachUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserData(decoded.id);

    // 🔥 If user deleted OR blocked → logout
    if (!user || user.isBlock) {
      clearAuthCookie(res, "token");
      req.user = null;
      res.locals.user=null;
      return next();
    }

    req.user = user;
    res.locals.user = user;
  } catch (err) {
    console.log(err);
    res.clearCookie("token", { path: "/" });
    req.user = null;
    res.locals.user = null;
  }

  next();
};

export default attachUser;
