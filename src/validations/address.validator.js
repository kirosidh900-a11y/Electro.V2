import Joi from "joi";

// ── Reusable patterns ──────────────────────────────────────────────────────
const INDIAN_PHONE  = /^[6-9]\d{9}$/;
const PINCODE       = /^[1-9][0-9]{5}$/;          // no leading zero
const NAME_PATTERN  = /^[A-Za-z\s.'-]{2,60}$/;    // letters, spaces, dots, hyphens, apostrophes
const CITY_PATTERN  = /^[A-Za-z\s.'-]{2,60}$/;

export const addressSchema = Joi.object({

  // ── Personal ──────────────────────────────────────────────────────────────
  name: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      "string.empty":        "Full name is required",
      "string.min":          "Name must be at least 2 characters",
      "string.max":          "Name cannot exceed 60 characters",
      "string.pattern.base": "Name can only contain letters, spaces, dots, hyphens and apostrophes",
      "any.required":        "Full name is required",
    }),

  phone: Joi.string()
    .trim()
    .pattern(INDIAN_PHONE)
    .required()
    .messages({
      "string.empty":        "Phone number is required",
      "string.pattern.base": "Enter a valid 10-digit Indian mobile number (starts with 6–9)",
      "any.required":        "Phone number is required",
    }),

  altPhone: Joi.string()
    .trim()
    .pattern(INDIAN_PHONE)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "Alternate phone must be a valid 10-digit Indian mobile number",
    }),

  // ── Location ──────────────────────────────────────────────────────────────
  pincode: Joi.string()
    .trim()
    .pattern(PINCODE)
    .required()
    .messages({
      "string.empty":        "Pincode is required",
      "string.pattern.base": "Enter a valid 6-digit pincode (cannot start with 0)",
      "any.required":        "Pincode is required",
    }),

  locality: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      "string.empty": "Locality / area is required",
      "string.min":   "Locality must be at least 3 characters",
      "string.max":   "Locality cannot exceed 100 characters",
      "any.required": "Locality / area is required",
    }),

  address: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      "string.empty": "Street address is required",
      "string.min":   "Address must be at least 5 characters",
      "string.max":   "Address cannot exceed 200 characters",
      "any.required": "Street address is required",
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .pattern(CITY_PATTERN)
    .required()
    .messages({
      "string.empty":        "City / town is required",
      "string.min":          "City name must be at least 2 characters",
      "string.max":          "City name cannot exceed 60 characters",
      "string.pattern.base": "City name can only contain letters, spaces, dots and hyphens",
      "any.required":        "City / town is required",
    }),

  state: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .required()
    .messages({
      "string.empty": "State is required",
      "string.min":   "State name must be at least 2 characters",
      "any.required": "State is required",
    }),

  stateCode: Joi.string()
    .trim()
    .min(2)
    .max(10)
    .required()
    .messages({
      "string.empty": "State code is required",
      "any.required": "State code is required",
    }),

  district: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .required()
    .messages({
      "string.empty": "District is required",
      "string.min":   "District name must be at least 2 characters",
      "any.required": "District is required",
    }),

  landmark: Joi.string()
    .trim()
    .max(100)
    .allow("", null)
    .optional()
    .messages({
      "string.max": "Landmark cannot exceed 100 characters",
    }),

  // ── Meta ──────────────────────────────────────────────────────────────────
  addressType: Joi.string()
    .valid("home", "work", "Home", "Work")
    .default("home")
    .messages({
      "any.only": "Address type must be either 'home' or 'work'",
    }),

  isDefault: Joi.boolean()
    .default(false)
    .messages({
      "boolean.base": "Default flag must be true or false",
    }),

}).options({ stripUnknown: true });   // silently drop any extra fields
