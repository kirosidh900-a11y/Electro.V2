import {
  getCheckoutDataService,
  getBuyNowCheckoutData,
  setBuyNowSession,
} from "../../../services/user/checkout.service.js";
import { validateCartStockServiceCheck } from "../../../services/product/cart.service.js";
import setCookieMSG from "../../../utils/partials/setCookieMsg.utils.js";
import HTTP_STATUS from "../../../constant/statusCode.js";
import AppError from "../../../utils/partials/AppError.utils.js";

// ── Regular cart checkout ─────────────────────────────────────────────────────
export const getCheckoutPage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await getCheckoutDataService(userId);

    if (!result.valid) {
      setCookieMSG(res, "Some items in your cart are out of stock. Please review your cart.");
      return res.redirect("/cart");
    }

    res.render("user/home/checkout", {
      cart:      result.cart,
      addresses: result.addresses,
      isBuyNow:  false,
    });
  } catch (err) {
    next(err);
  }
};

// ── Buy Now ───────────────────────────────────────────────────────────────────
// GET /checkout?productId=...&variantId=...&qty=1
export const getBuyNowPage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, variantId, qty = "1" } = req.query;

    if (!productId || !variantId) {
      throw new AppError("Product and variant are required", HTTP_STATUS.BAD_REQUEST);
    }

    const quantity = Math.max(1, parseInt(qty) || 1);

    const result = await getBuyNowCheckoutData(userId, { productId, variantId, quantity });

    // Persist to Redis so placeOrder can read it
    await setBuyNowSession(String(userId), { productId, variantId, quantity });

    res.render("user/home/checkout", {
      cart:      result.cart,
      addresses: result.addresses,
      isBuyNow:  true,
    });
  } catch (err) {
    next(err);
  }
};

// ── Cart stock validation ─────────────────────────────────────────────────────
export const validateCartStockCheck = async (req, res, next) => {
  try {
    const result = await validateCartStockServiceCheck(req.user._id);

    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
