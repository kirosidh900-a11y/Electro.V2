import { applyCouponService, removeCouponService } from "../../../services/product/coupon.service.js";
import { getCartWithPricing } from "../../../utils/products/getCartWithPricing.js";

export const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    if (!code?.trim()) {
      return res.status(400).json({ success: false, message: "Please enter a coupon code" });
    }

    // Get current cart total (after product offers, before coupon)
    const cart = await getCartWithPricing(userId);
    const cartTotal = cart.items.reduce((sum, item) => {
      return sum + (item.variantId?.finalPrice ?? 0) * (item.quantity ?? 1);
    }, 0);

    const result = await applyCouponService({ userId, code, cartTotal });

    res.json({
      success: true,
      message: `Coupon "${result.code}" applied! You save ₹${result.discountAmount}`,
      discountAmount: result.discountAmount,
    });
  } catch (err) {
    next(err);
  }
};

export const removeCoupon = async (req, res, next) => {
  try {
    await removeCouponService(req.user._id);
    res.json({ success: true, message: "Coupon removed" });
  } catch (err) {
    next(err);
  }
};
