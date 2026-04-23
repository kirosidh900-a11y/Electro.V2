import { getWalletService, creditWallet } from "../../services/user/wallet.service.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const getWalletPage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;

    const data = await getWalletService({ userId, page, limit: 10 });

    return res.render("user/home/wallet", {
      ...data,
      currentRoute: "/wallet",
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

export const addMoneyToWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const amount = parseFloat(req.body.amount);

    if (!amount || amount < 1) {
      throw new AppError("Invalid amount", HTTP_STATUS.BAD_REQUEST);
    }

    const newBalance = await creditWallet({
      userId,
      amount,
      description: "Money added to wallet",
      source: "top_up",
    });

    res.json({ success: true, message: "Money added successfully", balance: newBalance });
  } catch (err) {
    next(err);
  }
};
