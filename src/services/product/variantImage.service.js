import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import {
  deleteFromCloudinary,
} from "../partials/cloudinary.service.js";

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

  // push image (support multiple images)
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

export const replaceVariantImageService = async ({
  productId,
  variantId,
  oldImageId,
  newImage,
  newImageId,
}) => {
  const product = await Products.findById(productId);

  if (!product) throw new Error("Product not found");

  const variant = product.variants.id(variantId);

  if (!variant) throw new Error("Variant not found");

  const imageIndex = variant.product_images.findIndex(
    (img) => img.imageId === oldImageId,
  );

  if (imageIndex === -1) throw new Error("Image not found");

  const oldImage = variant.product_images[imageIndex];

  // 🔥 replace in DB first (safe)
  variant.product_images[imageIndex] = {
    url: newImage,
    imageId: newImageId,
  };

  await product.save();

  // 🔥 delete old image AFTER success (safe approach)
  try {
    await deleteFromCloudinary(oldImage.imageId);
  } catch (err) {
    console.warn("Old image delete failed:", err);
    throw new Error("Failed to delete old image from cloudinary");
  }

  return {
    message: "Image replaced successfully",
    images: variant.product_images,
  };
};
