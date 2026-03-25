import jwt from "jsonwebtoken";
import User from "../../models/userSchema.model.js";

import Wishlist from "../../models/wishlistSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const verifyAdmin = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id)
    .select("+password") // include password
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const hasPassword = !!user.password;

  delete user.password; // remove before returning

  return {
    ...user,
    hasPassword,
    provider: user.googleId ? "google" : "local",
  };
};

export const verifyUser = async (token) => {
  try {
    /* ================= VERIFY TOKEN ================= */
    if (!token) {
      throw new AppError("Token missing", HTTP_STATUS.UNAUTHORIZED);
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Token expired", HTTP_STATUS.UNAUTHORIZED);
      }
      throw new AppError("Invalid token", HTTP_STATUS.UNAUTHORIZED);
    }

    const userId = decoded.id;

    /* ================= PARALLEL FETCH ================= */
    const [user, wishlist, cart] = await Promise.all([
      User.findById(userId).select("+password").lean(),

      Wishlist.findOne({ userId })
        .select("items.productId items.variantId")
        .lean(),

      Cart.findOne({ userId }).select("items.productId items.variantId").lean(),
    ]);

    /* ================= USER CHECK ================= */
    if (!user) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    /* ================= USER INFO ================= */
    const hasPassword = !!user.password;
    delete user.password;

    /* ================= WISHLIST ================= */
    const wishlistItems = wishlist?.items || [];
    const wishlistCount = wishlistItems.length;

    /* ================= CART ================= */
    const cartItems = cart?.items || [];
    const cartCount = cartItems.length;

    /* ================= FINAL RESPONSE ================= */
    return {
      user: {
        ...user,
        hasPassword,
        provider: user.googleId ? "google" : "local",
      },

      wishlist: {
        count: wishlistCount,
        items: wishlistItems,
      },

      cart: {
        count: cartCount,
        items: cartItems,
      },
    };
  } catch (err) {
    console.error("VerifyUser Error:", err.message);

    // ✅ If already AppError → throw directly
    if (err instanceof AppError) {
      throw err;
    }

    // Unknown error
    throw new AppError(
      "Authentication failed",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
