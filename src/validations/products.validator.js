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

const idMessages = (name) => ({
  "any.required": `${name} is required`,
  "string.empty": `${name} cannot be empty`,
  "string.hex": `${name} must be a valid ID`,
  "string.length": `${name} must be 24 characters`,
});

const objectId = Joi.string().hex().length(24);

/* ================= WISHLIST ================= */
export const wishlistSchema = Joi.object({
  productId: objectId.required().messages(idMessages("Product ID")),
  variantId: objectId.required().messages(idMessages("Variant ID")),
});

/* ================= CART ================= */
export const cartSchema = Joi.object({
  productId: objectId.required().messages(idMessages("Product ID")),

  variantId: objectId.required().messages(idMessages("Variant ID")),

  quantity: Joi.number().integer().min(1).required().messages({
    "any.required": "Quantity is required",
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
  }),
});

/* ================= OFFERS ================= */
const objectIdMsg = (field) => ({
  "string.hex": `${field} must be a valid ID`,
  "string.length": `${field} must be 24 characters`,
});

export const offerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.base":  "Offer name must be a string",
    "string.empty": "Offer name is required",
    "string.min":   "Offer name must be at least 3 characters",
    "string.max":   "Offer name cannot exceed 100 characters",
    "any.required": "Offer name is required",
  }),

  discount_type: Joi.string().valid("percentage", "fixed").required().messages({
    "any.only":     "Discount type must be either 'percentage' or 'fixed'",
    "any.required": "Discount type is required",
  }),

  discount: Joi.when("discount_type", {
    is: "percentage",
    then: Joi.number().min(1).max(100).required().messages({
      "number.base":     "Discount must be a number",
      "number.min":      "Percentage discount must be at least 1%",
      "number.max":      "Percentage discount cannot exceed 100%",
      "any.required":    "Discount percentage is required",
    }),
    otherwise: Joi.number().positive().required().messages({
      "number.base":     "Discount must be a number",
      "number.positive": "Fixed discount must be greater than 0",
      "any.required":    "Discount amount is required",
    }),
  }),

  // Only required for percentage; optional (ignored) for fixed
  max_discount: Joi.when("discount_type", {
    is: "percentage",
    then: Joi.number().positive().required().messages({
      "number.base":     "Max discount must be a number",
      "number.positive": "Max discount must be greater than 0",
      "any.required":    "Max discount cap is required for percentage offers",
    }),
    otherwise: Joi.number().positive().optional().messages({
      "number.positive": "Max discount must be greater than 0",
    }),
  }),

  applies_to: Joi.string()
    .valid("product", "category", "brand", "all")
    .required()
    .messages({
      "any.only":     "Applies to must be one of: product, category, brand, all",
      "any.required": "Applies to field is required",
    }),

  target_ids: Joi.when("applies_to", {
    is: Joi.valid("product", "category", "brand"),
    then: Joi.array()
      .items(Joi.string().hex().length(24).messages(objectIdMsg("Target ID")))
      .min(1)
      .required()
      .messages({
        "array.base":   "Targets must be an array",
        "array.min":    "Select at least one target",
        "any.required": "Target selection is required when applies to is not 'all'",
      }),
    otherwise: Joi.array().optional(),
  }),

  start_date: Joi.date().required().min("now").messages({
    "date.base":    "Start date must be a valid date",
    "date.min":     "Start date cannot be in the past",
    "any.required": "Start date is required",
  }),

  end_date: Joi.date().required().greater(Joi.ref("start_date")).messages({
    "date.base":    "End date must be a valid date",
    "date.greater": "End date must be after the start date",
    "any.required": "End date is required",
  }),

  is_active: Joi.boolean().default(true),
});

export const updateofferSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.base":  "Offer name must be a string",
    "string.empty": "Offer name is required",
    "string.min":   "Offer name must be at least 3 characters",
    "string.max":   "Offer name cannot exceed 100 characters",
    "any.required": "Offer name is required",
  }),

  discount_type: Joi.string().valid("percentage", "fixed").required().messages({
    "any.only":     "Discount type must be either 'percentage' or 'fixed'",
    "any.required": "Discount type is required",
  }),

  discount: Joi.when("discount_type", {
    is: "percentage",
    then: Joi.number().min(1).max(100).required().messages({
      "number.base":     "Discount must be a number",
      "number.min":      "Percentage discount must be at least 1%",
      "number.max":      "Percentage discount cannot exceed 100%",
      "any.required":    "Discount percentage is required",
    }),
    otherwise: Joi.number().positive().required().messages({
      "number.base":     "Discount must be a number",
      "number.positive": "Fixed discount must be greater than 0",
      "any.required":    "Discount amount is required",
    }),
  }),

  max_discount: Joi.when("discount_type", {
    is: "percentage",
    then: Joi.number().positive().required().messages({
      "number.base":     "Max discount must be a number",
      "number.positive": "Max discount must be greater than 0",
      "any.required":    "Max discount cap is required for percentage offers",
    }),
    otherwise: Joi.number().positive().optional().messages({
      "number.positive": "Max discount must be greater than 0",
    }),
  }),

  applies_to: Joi.string()
    .valid("product", "category", "brand", "all")
    .required()
    .messages({
      "any.only":     "Applies to must be one of: product, category, brand, all",
      "any.required": "Applies to field is required",
    }),

  target_ids: Joi.when("applies_to", {
    is: Joi.valid("product", "category", "brand"),
    then: Joi.array()
      .items(Joi.string().hex().length(24).messages(objectIdMsg("Target ID")))
      .min(1)
      .required()
      .messages({
        "array.base":   "Targets must be an array",
        "array.min":    "Select at least one target",
        "any.required": "Target selection is required when applies to is not 'all'",
      }),
    otherwise: Joi.array().optional(),
  }),

  // Update allows past start_date (already started offers)
  start_date: Joi.date().required().messages({
    "date.base":    "Start date must be a valid date",
    "any.required": "Start date is required",
  }),

  end_date: Joi.date().required().greater(Joi.ref("start_date")).messages({
    "date.base":    "End date must be a valid date",
    "date.greater": "End date must be after the start date",
    "any.required": "End date is required",
  }),

  is_active: Joi.boolean().default(true),
});
