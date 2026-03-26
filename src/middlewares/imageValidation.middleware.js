import HTTP_STATUS from "../constant/statusCode.js";
import AppError from "../utils/partials/AppError.utils.js";

export const validateVariantImages = (req, res, next) => {
  const files = req.files || [];

  // optional: require at least 3 image
  
  if (files.length < 3) {
    return next(
      new AppError("At least three image is required", HTTP_STATUS.BAD_REQUEST),
    );
  }

  if (files.length > 5) {
    return next(
      new AppError("Maximum 5 images allowed", HTTP_STATUS.BAD_REQUEST),
    );
  }

  next();
};
