import clearAuthCookie from "../utils/partials/clearCookie.js";
import setCookieMSG from "../utils/partials/setCookieMsg.utils.js";
import verifyUser from "../utils/partials/verifyToken.utils.js";

const attachUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await verifyUser(token);

    // 🔥 If user deleted OR blocked → logout
    if (!user || user.isBlock) {
      clearAuthCookie(res, "token");

      // store toast message in cookie
      if (user.isBlock) {
        setCookieMSG(res, "Your account is blocked!");
      }

      req.user = null;
      res.locals.user = null;

      return res.redirect('/auth/login');
    }

    req.user = user;
    res.locals.user = user;
  } catch (err) {
    console.error(err);
    res.clearCookie("token", { path: "/" });
    req.user = null;
    res.locals.user = null;
  }

  next();
};

export default attachUser;