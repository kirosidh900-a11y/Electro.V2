import User from "../../models/userSchema.model.js";
import AppError from "../../utils/partials/AppError.js";

// Create a unique referral code
export const createRef = async () => {
  let referralCode;
  let isExist = true;

  while (isExist) {
    referralCode = `ELECTRO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const existingUser = await User.findOne({ referral: referralCode });
    if (!existingUser) isExist = false;
  }
  return referralCode;
};

// Validate a referral code
export const isValidReferral = async (referral_by, currentEmail = null) => {
  const code = referral_by?.trim().toUpperCase();
  if (!code) return null;

  const owner = await User.findOne({ referralCode: code });
  if (!owner) throw new AppError("Invalid referral code", 400);

  if (currentEmail && owner.email === currentEmail) {
    throw new AppError("You cannot refer yourself", 400);
  }

  return owner;
};
