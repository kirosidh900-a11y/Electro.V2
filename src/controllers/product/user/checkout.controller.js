import { getCheckoutDataService } from "../../../services/user/checkout.service.js";
import { validateCartStockServiceCheck } from "../../../services/product/cart.service.js";
import setCookieMSG from "../../../utils/partials/setCookieMsg.utils.js";
import HTTP_STATUS from "../../../constant/statusCode.js";

export const getCheckoutPage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await getCheckoutDataService(userId);

    if (!result.valid) {
      setCookieMSG(res, "Some items in your cart are out of stock. Please review your cart.");
      return res.redirect("/cart");
    }

    res.render("user/home/checkout", { cart: result.cart, addresses: result.addresses });
  } catch (err) {
    next(err);
  }
};

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
