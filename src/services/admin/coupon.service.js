import Coupon from "../../models/couponSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

const LIMIT = 10;

export const getCouponsService = async ({ page }) => {
  const skip  = (page - 1) * LIMIT;
  const total = await Coupon.countDocuments();

  const coupons = await Coupon.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(LIMIT)
    .lean();

  return {
    coupons,
    currentPage: page,
    totalPages: Math.ceil(total / LIMIT),
    total,
  };
};

export const createCouponService = async (data) => {
  const exists = await Coupon.findOne({ code: data.code.toUpperCase() });
  if (exists) throw new AppError("Coupon code already exists", HTTP_STATUS.BAD_REQUEST);

  return Coupon.create(data);
};

export const getCouponByIdService = async (id) => {
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) throw new AppError("Coupon not found", HTTP_STATUS.NOT_FOUND);
  return coupon;
};

export const updateCouponService = async (id, data) => {
  const exists = await Coupon.findOne({
    code: data.code.toUpperCase(),
    _id: { $ne: id },
  });
  if (exists) throw new AppError("Coupon code already exists", HTTP_STATUS.BAD_REQUEST);

  const coupon = await Coupon.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw new AppError("Coupon not found", HTTP_STATUS.NOT_FOUND);
  return coupon;
};

export const toggleCouponStatusService = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new AppError("Coupon not found", HTTP_STATUS.NOT_FOUND);

  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return coupon;
};

export const deleteCouponService = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new AppError("Coupon not found", HTTP_STATUS.NOT_FOUND);
  return coupon;
};

export const checkCouponCodeService = async (code) => {
  const exists = await Coupon.findOne({ code: code.trim().toUpperCase() }).lean();
  return !exists; // true = available
};
