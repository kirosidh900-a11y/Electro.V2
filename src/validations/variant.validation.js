import Joi from "joi";

export const addVariantSchema = Joi.object({
  sku: Joi.string().trim().min(3).required().messages({
    "string.empty": "SKU is required",
    "string.min": "SKU must be at least 3 characters",
  }),

  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number",
    "number.min": "Price cannot be negative",
    "any.required": "Price is required",
  }),

  // ✅ ADD THIS
  regular_price: Joi.number().min(0).required().messages({
    "number.base": "Regular price must be a number",
    "number.min": "Regular price cannot be negative",
    "any.required": "Regular price is required",
  }),

  // ✅ ADD THIS
  max_discount_amount: Joi.number().min(0).required().messages({
    "number.base": "Max discount must be a number",
    "number.min": "Max discount cannot be negative",
    "any.required": "Max discount amount is required",
  }),

  gst_rate: Joi.number().min(0).max(100).optional().messages({
    "number.base": "GST rate must be a number",
    "number.min": "GST rate cannot be negative",
    "number.max": "GST rate cannot exceed 100",
  }),

  stock: Joi.number().integer().min(0).required().messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),

  description: Joi.string().trim().min(5).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 5 characters",
  }),

  attributes: Joi.object()
    .pattern(Joi.string(), Joi.string().allow("").trim())
    .required()
    .messages({
      "object.base": "Attributes must be an object",
    }),
}).custom((value, helpers) => {
  // 🔥 CROSS VALIDATION
  if (value.regular_price < value.price) {
    return helpers.message(
      "Regular price must be greater than or equal to price",
    );
  }

  return value;
});

export const editVariantSchema = Joi.object({
  sku: Joi.string().trim().required().messages({
    "string.base": "SKU must be a string",
    "any.required": "SKU is required",
  }),

  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number",
    "number.min": "Price cannot be negative",
    "any.required": "Price is required",
  }),

  regular_price: Joi.number().min(0).required().messages({
    "number.base": "Regular price must be a number",
    "number.min": "Regular price cannot be negative",
    "any.required": "Regular price is required",
  }),

  max_discount_amount: Joi.number().min(0).required().messages({
    "number.base": "Max discount must be a number",
    "number.min": "Max discount cannot be negative",
    "any.required": "Max discount amount is required",
  }),

  gst_rate: Joi.number().min(0).max(100).optional().messages({
    "number.base": "GST rate must be a number",
    "number.min": "GST rate cannot be negative",
    "number.max": "GST rate cannot exceed 100",
  }),

  stock: Joi.number().min(0).required().messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
    "any.required": "Stock is required",
  }),

  description: Joi.string().required().messages({
    "string.base": "Description must be a string",
    "any.required": "Description is required",
  }),

  attributes: Joi.object().required().messages({
    "object.base": "Attributes must be an object",
    "any.required": "Attributes are required",
  }),

  deleteImages: Joi.string()
    .custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return value;
      } catch {
        return helpers.message("deleteImages must be a valid JSON array");
      }
    })
    .optional(),

  replaceImageIds: Joi.any().optional(),
}).custom((value, helpers) => {
  // 🔥 CROSS VALIDATION
  if (value.regular_price < value.price) {
    return helpers.message(
      "Regular price must be greater than or equal to price",
    );
  }

  return value;
});
