import Joi from "joi";

export const addressSchema = Joi.object({
  name: Joi.string().min(2).required(),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  altPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .allow("", null),

  pincode: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),

  locality: Joi.string().required(),

  address: Joi.string().required(),

  city: Joi.string().required(),

  state: Joi.string().required(),
  stateCode: Joi.string().required(),

  district: Joi.string().required(),

  landmark: Joi.string().allow("", null),

  addressType: Joi.string().valid("home", "work"),

  isDefault: Joi.boolean(),
});
