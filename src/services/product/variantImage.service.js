import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import { deleteFromCloudinary } from "../partials/cloudinary.service.js";

export const addVariantImageService = async ({
  productId,
  variantId,
  image,
  imageId,
}) => {
  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  // ✅ push image (support multiple images)
  variant.product_images.push({
    url: image,
    imageId: imageId,
  });

  await product.save();

  return {
    message: "Variant image added successfully",
    image,
  };
};

export const deleteVariantImageService = async ({
  productId,
  variantId,
  imageId,
}) => {
  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  const image = variant.product_images.find((img) => img.imageId === imageId);

  if (!image) {
    throw new AppError("Image not found", HTTP_STATUS.NOT_FOUND);
  }

  // delete from cloudinary
  await deleteFromCloudinary(image.imageId);

  // remove from DB
  variant.product_images = variant.product_images.filter(
    (img) => img.imageId !== imageId,
  );

  await product.save();

  return {
    message: "Variant image deleted successfully",
  };
};
