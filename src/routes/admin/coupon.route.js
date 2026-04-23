import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createCouponSchema, updateCouponSchema } from "../../validations/coupon.validator.js";
import {
  getCouponsPage,
  createCoupon,
  getCouponById,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  checkCouponCode,
} from "../../controllers/admin/coupon.controller.js";

const router = Router();

router.get("/", isAuth, getCouponsPage);
router.get("/check-code", isAuth, checkCouponCode);   // before /:id
router.post("/", isAuth, validate(createCouponSchema), createCoupon);
router.get("/:id", isAuth, getCouponById);
router.patch("/:id", isAuth, validate(updateCouponSchema), updateCoupon);
router.patch("/:id/status", isAuth, toggleCouponStatus);
router.delete("/:id", isAuth, deleteCoupon);

export default router;
