import { Wallet, WalletTransaction } from "../../models/walletSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

// Get or create wallet for a user
export const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) wallet = await Wallet.create({ userId, balance: 0 });
  return wallet;
};

export const getWalletService = async ({ userId, page = 1, limit = 10 }) => {
  const wallet = await getOrCreateWallet(userId);

  const skip = (page - 1) * limit;
  const total = await WalletTransaction.countDocuments({ walletId: wallet._id });

  const transactions = await WalletTransaction.find({ walletId: wallet._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    wallet,
    balance: wallet.balance,
    transactions,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  };
};

// Credit — adds money to wallet, logs transaction
export const creditWallet = async ({ userId, amount, description, source = "top_up", orderId = null }) => {
  const wallet = await getOrCreateWallet(userId);

  wallet.balance += amount;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    userId,
    type: "credit",
    amount,
    description,
    source,
    orderId,
    balanceAfter: wallet.balance,
  });

  return wallet.balance;
};

// Debit — deducts money from wallet, logs transaction
export const debitWallet = async ({ userId, amount, description, source = "order_payment", orderId = null }) => {
  const wallet = await getOrCreateWallet(userId);

  if (wallet.balance < amount) {
    throw new AppError("Insufficient wallet balance", HTTP_STATUS.BAD_REQUEST);
  }

  wallet.balance -= amount;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    userId,
    type: "debit",
    amount,
    description,
    source,
    orderId,
    balanceAfter: wallet.balance,
  });

  return wallet.balance;
};
