import HTTP_STATUS from "../constant/statusCode.js";
import { errorResponse } from "../utils/partials/response.util.js";

export const validate = (schema) => (req, res, next) => {
  try {
    // ✅ Parse attributes safely
    if (typeof req.body.attributes === "string") {
      try {
        req.body.attributes = JSON.parse(req.body.attributes);
      } catch {
        return errorResponse(
          res,
          "Invalid attributes format",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      errors: { wrap: { label: "" } }, // ✅ remove quotes
    });

    if (error) {
      const message = error.details.map((e) => e.message).join(", ");

      return errorResponse(res, message, HTTP_STATUS.BAD_REQUEST);
    }

    // ✅ assign validated data
    req.body = value;

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect("/auth/login"); 
  }
  next();
};