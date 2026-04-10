import addressSchemaModel from "../../../models/addressSchema.model.js";
import {
  validateCartStockServiceCheck,
} from "../../../services/product/cart.service.js";
import setCookieMSG from "../../../utils/partials/setCookieMsg.utils.js";
import { getCartWithPricing } from "../../../utils/products/getCartWithPricing.js";

export const getCheckoutPage = async (req, res) => {
  const userId = req.user._id;

  // validate stock
  const result = await validateCartStockServiceCheck(userId);

  if (!result.success) {
    setCookieMSG(res, "Some items in your cart are out of stock. Please review your cart.");
    return res.redirect("/cart");
  }

  const cart = await getCartWithPricing(userId); // reuse your logic

  const addresses = await addressSchemaModel.find({ userId });

  res.render("user/home/checkout", {
    cart,
    addresses,
  });
};

export const validateCartStockCheck = async (req, res, next) => {
  try {
    const result = await validateCartStockServiceCheck(req.user._id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
