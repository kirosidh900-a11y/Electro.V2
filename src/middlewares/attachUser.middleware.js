import clearAuthCookie from "../utils/partials/clearCookie.js";
import setCookieMSG from "../utils/partials/setCookieMsg.utils.js";
import { verifyUser } from "../utils/partials/verifyToken.utils.js";

const attachUser = async (req, res, next) => {
  const token = req.cookies?.token;

  // ================= NO TOKEN =================
  if (!token) {
    req.user = null;
    res.locals.user = null;
    res.locals.cart = null;
    res.locals.wishlist = null;
    res.locals.wishlistSet = null;
    res.locals.cartSet = null;
    setCookieMSG(res, "Please log in to continue!");
    return next();
  }

  try {
    const { user, cart, wishlist } = await verifyUser(token);

    // ================= USER INVALID / BLOCKED =================
    if (!user || user.isBlock) {
      clearAuthCookie(res, "token");

      // optional toast message
      if (user?.isBlock) {
        setCookieMSG(res, "Your account is blocked!");
      }

      req.user = null;
      res.locals.user = null;
      res.locals.cart = null;
      res.locals.wishlist = null;
      res.locals.wishlistSet = null;
      res.locals.cartSet = null;

      // only redirect for views (not APIs)
      if (!req.originalUrl.startsWith("/api")) {
        return res.redirect("/auth/login");
      }

      return next();
    }

    // ================= SUCCESS =================
    req.user = user;

    res.locals.user = user;
    res.locals.cart = cart;
    res.locals.wishlist = wishlist;
    res.locals.wishlistSet = new Set(
      wishlist.items.map((i) => `${i.productId}_${i.variantId}`),
    );

    res.locals.cartSet = new Set(
      cart.items.map((i) => `${i.productId}_${i.variantId}`),
    );

    res.locals.currentRoute = req.path;
  } catch (err) {
    console.error("attachUser Error:", err.message);

    clearAuthCookie(res, "token");

    req.user = null;
    res.locals.user = null;
    res.locals.cart = null;
    res.locals.wishlist = null;
    res.locals.wishlistSet = null;
    res.locals.cartSet = null;
  }

  next();
};

export default attachUser;
