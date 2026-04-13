import mongoose from "mongoose";

// One wallet per user — only stores balance
const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const Wallet = mongoose.model("Wallet", walletSchema);

// All transaction history linked to a wallet
const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ["refund", "referral", "cashback", "order_payment", "top_up", "admin"],
      default: "top_up",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
