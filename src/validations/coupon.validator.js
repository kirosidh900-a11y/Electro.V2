import Joi from "joi";

const base = {
  code: Joi.string()
    .trim()
    .uppercase()
    .alphanum()
    .min(3)
    .max(20)
    .required()
    .messages({
      "string.empty": "Coupon code is required",
      "string.alphanum": "Coupon code must contain only letters and numbers",
      "string.min": "Coupon code must be at least 3 characters",
      "string.max": "Coupon code cannot exceed 20 characters",
      "any.required": "Coupon code is required",
    }),

  description: Joi.string().trim().max(200).optional().allow("").messages({
    "string.max": "Description cannot exceed 200 characters",
  }),

  discountType: Joi.string().valid("percentage", "fixed").required().messages({
    "any.only": "Discount type must be 'percentage' or 'fixed'",
    "any.required": "Discount type is required",
  }),

  discountValue: Joi.when("discountType", {
    is: "percentage",
    then: Joi.number().min(1).max(100).required().messages({
      "number.base": "Discount value must be a number",
      "number.min": "Percentage discount must be at least 1%",
      "number.max": "Percentage discount cannot exceed 100%",
      "any.required": "Discount value is required",
    }),
    otherwise: Joi.number().positive().required().messages({
      "number.base": "Discount value must be a number",
      "number.positive": "Fixed discount must be greater than 0",
      "any.required": "Discount value is required",
    }),
  }),

  maxDiscount: Joi.when("discountType", {
    is: "percentage",
    then: Joi.number().positive().optional().messages({
      "number.positive": "Max discount cap must be greater than 0",
    }),
    otherwise: Joi.optional(),
  }),

  minOrderAmount: Joi.number().min(0).default(0).messages({
    "number.min": "Minimum order amount cannot be negative",
  }),

  usageLimit: Joi.number().integer().min(1).optional().allow(null).messages({
    "number.integer": "Usage limit must be a whole number",
    "number.min": "Usage limit must be at least 1",
  }),

  perUserLimit: Joi.number().integer().min(1).optional().allow(null).messages({
    "number.integer": "Per user limit must be a whole number",
    "number.min": "Per user limit must be at least 1",
  }),

  expiryDate: Joi.date().required().messages({
    "date.base": "Expiry date must be a valid date",
    "any.required": "Expiry date is required",
  }),

  isActive: Joi.boolean().default(true),
};

export const createCouponSchema = Joi.object({
  ...base,

  startDate: Joi.date()
    .required()
    .min(new Date().setHours(0, 0, 0, 0))
    .messages({
      "date.base": "Start date must be a valid date",
      "date.min": "Start date must be from today onwards",
      "any.required": "Start date is required",
    }),

  expiryDate: Joi.date()
    .required()
    .greater(Joi.ref("startDate"))
    .messages({
      "date.base": "Expiry date must be a valid date",
      "date.greater": "Expiry date must be after the start date",
      "any.required": "Expiry date is required",
    }),
});

export const updateCouponSchema = Joi.object({
  ...base,

  startDate: Joi.date()
    .required()
    .min(new Date().setHours(0, 0, 0, 0))
    .messages({
      "date.base": "Start date must be a valid date",
      "date.min": "Start date must be from today onwards",
      "any.required": "Start date is required",
    }),

  expiryDate: Joi.date()
    .required()
    .greater(Joi.ref("startDate"))
    .messages({
      "date.base": "Expiry date must be a valid date",
      "date.greater": "Expiry date must be after the start date",
      "any.required": "Expiry date is required",
    }),
});
