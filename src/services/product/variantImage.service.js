import Products from "../../models/productSchema.model.js";
import cloudinary from "../../config/cloudinary.js";
import AppError from "../../utils/partials/AppError.utils.js";


export const addVariantImageService = async ({
  productId,
  variantId,
  imagePath,
}) => {

  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError("Variant not found", 404);
  }

  if (!variant.product_image) {
    variant.product_image = [];
  }

  // ✅ Image limit
  if (variant.product_image.length >= 3) {
    throw new AppError(
      `Maximum 3 images allowed. Current images: ${variant.product_image.length}`,
      400
    );
  }

  try {

    variant.product_image.push(imagePath);

    product.markModified("variants");

    await product.save();

    return {
      message: "Image uploaded successfully",
      image: imagePath,
    };

  } catch (error) {

    const publicId = imagePath.split("/").pop().split(".")[0];

    await cloudinary.uploader.destroy(`products/${publicId}`);

    throw new AppError("Failed to save image", 500);
  }
};


export const deleteVariantImageService = async ({
  productId,
  variantId,
  public_id,
}) => {

  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError("Variant not found", 404);
  }

  const imageIndex = variant.product_image.findIndex((img) =>
    img.includes(public_id)
  );

  if (imageIndex === -1) {
    throw new AppError("Image not found", 404);
  }

  const imagePath = variant.product_image[imageIndex];

  await cloudinary.uploader.destroy(public_id);

  variant.product_image.splice(imageIndex, 1);

  product.markModified("variants");

  await product.save();

  return {
    message: "Image deleted successfully",
  };
};