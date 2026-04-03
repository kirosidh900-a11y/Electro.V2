import HTTP_STATUS from "../constant/statusCode.js";
import AppError from "../utils/partials/AppError.utils.js";
import { fileTypeFromBuffer } from "file-type";
import Product from "../models/productSchema.model.js";

export const validateVariantImages = async (req, res, next) => {
  try {
    const files = req.files || [];

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    // ================= FILE TYPE VALIDATION =================
    for (const file of files) {
      // REAL FILE VALIDATION (BEST)
      const type = await fileTypeFromBuffer(file.buffer);

      if (!type || !allowedMimeTypes.includes(type.mime)) {
        return next(
          new AppError(
            "Only JPG, PNG, WEBP images allowed",
            HTTP_STATUS.BAD_REQUEST,
          ),
        );
      }

      // SIZE CHECK
      if (file.size > MAX_SIZE) {
        return next(
          new AppError("Image must be less than 5MB", HTTP_STATUS.BAD_REQUEST),
        );
      }
    }

    // ================= IMAGE COUNT LOGIC =================

    const variantId = req.params.variantId;
    let existingImagesCount = 0;

    if (variantId) {
      const product = await Product.findOne({
        "variants._id": variantId,
      });

      const variant = product?.variants.id(variantId);

      if (variant) {
        existingImagesCount = variant.product_images?.length || 0;
      }
    }

    // SAFE PARSE deleteImages
    let deleteImages = [];
    try {
      deleteImages = req.body.deleteImages
        ? JSON.parse(req.body.deleteImages)
        : [];
    } catch {
      return next(
        new AppError("Invalid deleteImages format", HTTP_STATUS.BAD_REQUEST),
      );
    }

    const deletedCount = deleteImages.length;

    const finalImageCount = existingImagesCount - deletedCount + files.length;

    // ✅ MIN CHECK (for BOTH create + edit)
    if (finalImageCount < 3) {
      return next(
        new AppError("At least 3 images required", HTTP_STATUS.BAD_REQUEST),
      );
    }

    // ✅ MAX CHECK
    if (finalImageCount > 5) {
      return next(
        new AppError("Maximum 5 images allowed", HTTP_STATUS.BAD_REQUEST),
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};
