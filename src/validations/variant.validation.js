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

export const editVariantSchema = Joi.object({
  sku: Joi.string().optional(),
  price: Joi.number().optional(),
  stock: Joi.number().optional(),
  description: Joi.string().optional(),
  attributes: Joi.object().optional(),
  deleteImages: Joi.string()
    .custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return value;
      } catch {
        return helpers.error("any.invalid");
      }
    })
    .optional(), // New field for images to delete

  replaceImageIds: Joi.any().optional(),
});
