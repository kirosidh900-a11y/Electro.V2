import addressSchemaModel from "../../../models/addressSchema.model.js";
import {
  validateCartStockService,
  validateCartStockServiceCheck,
} from "../../../services/product/cart.service.js";
import { getCartWithPricing } from "../../../utils/products/getCartWithPricing.js";

export const getCheckoutPage = async (req, res) => {
  const userId = req.user._id;

  // 🔥 validate stock
  const result = await validateCartStockServiceCheck(userId);
  console.log("Cart stock validation result:", result);

  if (!result.success) {
    // 🍪 store error message in cookie
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
