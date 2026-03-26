import Joi from "joi";

export const addressSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    "string.base": "Name must be a text",
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "any.required": "Name is required",
  }),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Enter a valid 10-digit Indian phone number",
      "any.required": "Phone number is required",
    }),

  altPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Alternate phone must be a valid 10-digit number",
    }),

  pincode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.empty": "Pincode is required",
      "string.pattern.base": "Pincode must be 6 digits",
      "any.required": "Pincode is required",
    }),

  locality: Joi.string().required().messages({
    "string.empty": "Locality is required",
    "any.required": "Locality is required",
  }),

  address: Joi.string().required().messages({
    "string.empty": "Address is required",
    "any.required": "Address is required",
  }),

  city: Joi.string().required().messages({
    "string.empty": "City is required",
    "any.required": "City is required",
  }),

  state: Joi.string().required().messages({
    "string.empty": "State is required",
    "any.required": "State is required",
  }),

  stateCode: Joi.string().required().messages({
    "string.empty": "State code is required",
    "any.required": "State code is required",
  }),

  district: Joi.string().required().messages({
    "string.empty": "District is required",
    "any.required": "District is required",
  }),

  landmark: Joi.string().allow("", null).messages({
    "string.base": "Landmark must be text",
  }),

  addressType: Joi.string().valid("home", "work").messages({
    "any.only": "Address type must be either 'home' or 'work'",
  }),

  isDefault: Joi.boolean().messages({
    "boolean.base": "Default flag must be true or false",
  }),
});
