import mongoose from "mongoose";
import Product from "../../models/productSchema.model.js";
import Wishlist from "../../models/wishlistSchema.model.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const updateWishlistService = async ({
  userId,
  productId,
  variantId,
}) => {
  const productObjId = new mongoose.Types.ObjectId(productId);
  const variantObjId = new mongoose.Types.ObjectId(variantId);

  const wishlist = await Wishlist.findOne({ userId });

  const exists = wishlist?.items?.some(
    (item) =>
      item.productId.equals(productObjId) &&
      item.variantId.equals(variantObjId),
  );

  /* ================= REMOVE ================= */
  if (exists) {
    await Wishlist.updateOne(
      { userId },
      {
        $pull: {
          items: {
            productId: productObjId,
            variantId: variantObjId,
          },
        },
      },
    );

    return {
      success: true,
      added: false,
      stauts:HTTP_STATUS.OK,
      message: "Removed from wishlist",
    };
  }

  /* ================= VALIDATION ================= */

  const product = await Product.aggregate([
    {
      $match: {
        _id: productObjId,
        isDeleted: false,
        status: "listed",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $match: {
        "category.status": "listed",
        "category.isDeleted": false,
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    { $unwind: "$brand" },
    {
      $match: {
        "brand.status": "listed",
        "brand.isDeleted": false,
      },
    },
    {
      $project: {
        variants: 1,
      },
    },
  ]);

  if (!product.length) {
    return {
      success: false,
      status: 400,
      message: "Product not available now!",
    };
  }

  const productData = product[0];

  const variant = productData.variants.find(
    (v) => v._id.toString() === variantObjId.toString() && !v.isDeleted,
  );

  if (!variant) {
    return {
      success: false,
      status: HTTP_STATUS.BAD_REQUEST,
      message: "Variant not available!",
    };
  }

  /* ================= ADD ================= */

  await Wishlist.updateOne(
    { userId },
    {
      $addToSet: {
        items: {
          productId: productObjId,
          variantId: variantObjId,
        },
      },
    },
    { upsert: true },
  );

  return {
    success: true,
    added: true,
    status:HTTP_STATUS.OK,
    message: "Added to wishlist",
  };
};
