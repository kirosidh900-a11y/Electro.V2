import Coupon from "../../models/couponSchema.model.js";
import Cart from "../../models/cartSchema.models.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

// ── Validate & apply coupon to cart ─────────────────────────────────────────
export const applyCouponService = async ({ userId, code, cartTotal }) => {
  if (!code) throw new AppError("Coupon code is required", HTTP_STATUS.BAD_REQUEST);

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

  // 1. Exists?
  if (!coupon) throw new AppError("Invalid coupon code", HTTP_STATUS.NOT_FOUND);

  // 2. Active?
  if (!coupon.isActive) throw new AppError("This coupon is no longer active", HTTP_STATUS.BAD_REQUEST);

  // 3. Date range
  const now = new Date();
  if (coupon.startDate > now) throw new AppError("This coupon is not yet valid", HTTP_STATUS.BAD_REQUEST);
  if (coupon.expiryDate < now) throw new AppError("This coupon has expired", HTTP_STATUS.BAD_REQUEST);

  // 4. Usage limit
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("This coupon has reached its usage limit", HTTP_STATUS.BAD_REQUEST);
  }

  // 5. Min order amount
  if (cartTotal < coupon.minOrderAmount) {
    throw new AppError(
      `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 6. Per-user limit
  if (coupon.perUserLimit !== null) {
    const userUsage = coupon.usedBy.find(u => String(u.userId) === String(userId));
    if (userUsage && userUsage.usedCount >= coupon.perUserLimit) {
      throw new AppError(
        `You have already used this coupon ${coupon.perUserLimit} time(s)`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  // 7. Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.discountValue;
  }
  discountAmount = Math.min(Math.round(discountAmount), cartTotal); // never exceed total

  // 8. Save to cart using $set so Mongoose detects nested changes
  const cart = await Cart.findOneAndUpdate(
    { userId },
    {
      $set: {
        "appliedCoupon.code":           coupon.code,
        "appliedCoupon.couponId":        coupon._id,
        "appliedCoupon.discountAmount":  discountAmount,
        couponDiscountAmount:            discountAmount,
      },
    },
    { new: true, upsert: false }
  );
  if (!cart) throw new AppError("Cart not found", HTTP_STATUS.NOT_FOUND);

  return {
    code: coupon.code,
    discountAmount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    description: coupon.description,
  };
};

// ── Remove coupon from cart ──────────────────────────────────────────────────
export const removeCouponService = async (userId) => {
  const cart = await Cart.findOneAndUpdate(
    { userId },
    {
      $set: {
        "appliedCoupon.code":           null,
        "appliedCoupon.couponId":        null,
        "appliedCoupon.discountAmount":  0,
        couponDiscountAmount:            0,
      },
    },
    { new: true }
  );

  if (!cart) throw new AppError("Cart not found", HTTP_STATUS.NOT_FOUND);
};

// ── Mark coupon as used after order placed ───────────────────────────────────
export const markCouponUsed = async ({ userId, couponId }) => {
  if (!couponId) return;

  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;

  coupon.usedCount += 1;

  const userEntry = coupon.usedBy.find(u => String(u.userId) === String(userId));
  if (userEntry) {
    userEntry.usedCount += 1;
  } else {
    coupon.usedBy.push({ userId, usedCount: 1 });
  }

  await coupon.save();
};
