import HTTP_STATUS from "../constant/statusCode.js";
import { errorResponse } from "../utils/partials/response.util.js";

export const validate = (schema) => (req, res, next) => {
  try {
    // 🔥 FIX: parse attributes BEFORE Joi
    if (typeof req.body.attributes === "string") {
      try {
        req.body.attributes = JSON.parse(req.body.attributes);
      } catch {
        errorResponse(
          res,
          "Invalid attributes format",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const message = error.details.map((e) => e.message).join(", ");
      errorResponse(res, message, HTTP_STATUS.BAD_REQUEST);
    }

    req.body = value;
    next();
  } catch (err) {
    next(err);
  }
};
