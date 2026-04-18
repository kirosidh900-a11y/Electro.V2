import Coupon from "../../models/couponSchema.model.js";
import redisClient from "../../utils/partials/redisClient.util.js";
import {
  getCouponsService,
  createCouponService,
  getCouponByIdService,
  updateCouponService,
  toggleCouponStatusService,
  deleteCouponService,
} from "../../services/admin/coupon.service.js";

export const getCouponsPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await getCouponsService({ page });
    return res.render("admin/home/coupons", { ...data, title: "Coupon Management" });
  } catch (err) { next(err); }
};

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await createCouponService(req.body);
    res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (err) { next(err); }
};

export const getCouponById = async (req, res, next) => {
  try {
    const coupon = await getCouponByIdService(req.params.id);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await updateCouponService(req.params.id, req.body);
    res.json({ success: true, message: "Coupon updated successfully", data: coupon });
  } catch (err) { next(err); }
};

export const toggleCouponStatus = async (req, res, next) => {
  try {
    const coupon = await toggleCouponStatusService(req.params.id);
    res.json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
      isActive: coupon.isActive,
    });
  } catch (err) { next(err); }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    await deleteCouponService(req.params.id);
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) { next(err); }
};

// Check if a coupon code is already taken (used by auto-generate)
export const checkCouponCode = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code?.trim()) return res.json({ available: false });

    // Rate limit check
    const adminId  = req.cookies.adminToken?.slice(-16) || req.ip;
    const rateKey  = `coupon:gen1:${adminId}`;

    const count = await redisClient.incr(rateKey);
    if (count === 1) {
      // First call — set 1hr expiry
      await redisClient.expire(rateKey, 3600);
    }

    if (count > 10) {
      const ttl = await redisClient.ttl(rateKey);
      const mins = Math.ceil(ttl / 60);
      return res.status(429).json({
        available: false,
        message: `Auto-generate limit reached (10/hr). Try again in ${mins} minute(s).`,
        rateLimited: true,
      });
    }

    const exists = await Coupon.findOne({ code: code.trim().toUpperCase() }).lean();
    res.json({ available: !exists });
  } catch (err) { next(err); }
};
