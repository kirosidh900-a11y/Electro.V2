import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Product name is required",
  }),

  category: Joi.string().required().messages({
    "string.empty": "Category is required",
  }),

  brand: Joi.string().required().messages({
    "string.empty": "Brand is required",
  }),

  status: Joi.string().valid("listed", "unlisted").default("unlisted"),

  attributes: Joi.object().optional(),
});

export const variantSchema = Joi.object({
  sku: Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "SKU is required",
  }),

  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be greater than 0",
  }),

  stock: Joi.number().integer().min(0).required().messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),

  description: Joi.string().trim().min(5).max(500).optional(),

  attributes: Joi.object().required().messages({
    "object.base": "Attributes must be an object",
  }),
});

export const validateProductImages = (files) => {
  if (!files || files.length < 3) {
    throw new Error("At least 3 product images are required");
  }

  if (files.length > 6) {
    throw new Error("Maximum 6 images allowed");
  }
};
