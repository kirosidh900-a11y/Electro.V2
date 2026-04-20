import { getWalletService, creditWallet } from "../../services/user/wallet.service.js";

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
      return res.status(400).json({ success: false, message: "Invalid amount" });
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
