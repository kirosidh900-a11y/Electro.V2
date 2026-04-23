import addressSchemaModel from "../../models/addressSchema.model.js";
import { getCartWithPricing } from "../../utils/products/getCartWithPricing.js";
import { getOrCreateWallet } from "./wallet.service.js";
import { validateCartStockServiceCheck } from "../product/cart.service.js";

export const getCheckoutDataService = async (userId) => {
  const stockResult = await validateCartStockServiceCheck(userId);

  if (!stockResult.success) {
    return { valid: false };
  }

  const [cart, wallet, addresses] = await Promise.all([
    getCartWithPricing(userId),
    getOrCreateWallet(userId),
    addressSchemaModel.find({ userId }).lean(),
  ]);

  cart.walletBalance = wallet.balance;

  return { valid: true, cart, addresses };
};
