import User from "../../models/userSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import { creditWallet } from "./wallet.service.js";

const REFERRAL_BONUS = 500;
const MAX_REFERRALS = 3;

// Create a unique referral code
export const createRef = async () => {
  let referralCode;
  let isExist = true;

  while (isExist) {
    referralCode = `ELECTRO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) isExist = false;
  }
  return referralCode;
};

// Validate a referral code — also checks the 3-referral cap
export const isValidReferral = async (referral_by, currentEmail = null) => {
  const code = referral_by?.trim().toUpperCase();
  if (!code) return null;

  const owner = await User.findOne({ referralCode: code });
  if (!owner) throw new AppError("Invalid referral code", HTTP_STATUS.BAD_REQUEST);

  if (currentEmail && owner.email === currentEmail) {
    throw new AppError("You cannot refer yourself", HTTP_STATUS.BAD_REQUEST);
  }

  if (owner.referralCount >= MAX_REFERRALS) {
    throw new AppError(
      "This referral code has reached its maximum usage limit",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return owner;
};

// Credit ₹500 to the referrer and increment their referral count
export const applyReferralBonus = async (referral_by) => {
  const code = referral_by?.trim().toUpperCase();
  if (!code) return;

  const owner = await User.findOne({ referralCode: code });
  if (!owner || owner?.referralCount >= MAX_REFERRALS) return;

  // Increment count atomically
  await User.findByIdAndUpdate(owner._id, { $inc: { referralCount: 1 } });

  // Credit wallet
  await creditWallet({
    userId: owner._id,
    amount: REFERRAL_BONUS,
    description: `Referral bonus — someone signed up with your code`,
    source: "referral",
  });
};
