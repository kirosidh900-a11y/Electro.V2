import Joi from "joi";

export const addVariantSchema = Joi.object({
  sku: Joi.string().trim().min(3).required().messages({
    "string.empty": "SKU is required",
    "string.min": "SKU must be at least 3 characters",
  }),

  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be greater than 0",
  }),

  stock: Joi.number().integer().min(0).required().messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),

  description: Joi.string().trim().min(5).required().messages({
    "string.empty": "Description is required",
  }),

  attributes: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .required()
    .messages({
      "object.base": "Attributes must be an object",
    }),
});
