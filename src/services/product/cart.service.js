import mongoose from "mongoose";
import HTTP_STATUS from "../../constant/statusCode.js";
import Cart from "../../models/cartSchema.models.js";
import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import Wishlist from "../../models/wishlistSchema.model.js";

export const updateCartService = async ({
  userId,
  productId,
  variantId,
  quantity,
}) => {
  quantity = Number(quantity);

  if (!quantity || quantity <= 0) {
    throw new AppError("Invalid quantity", HTTP_STATUS.BAD_REQUEST);
  }

  const MAX_QTY = 3;

  if (quantity > MAX_QTY) {
    throw new AppError(
      "Maximum 3 items allowed per product",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  const productObjId = new mongoose.Types.ObjectId(productId);
  const variantObjId = new mongoose.Types.ObjectId(variantId);

  // ✅ Fetch only valid product + specific variant
  const product = await Products.findOne(
    {
      _id: productObjId,
      isDeleted: false,
      status: "listed",
      "variants._id": variantObjId,
    },
    {
      "variants.$": 1, // only matched variant
    },
  );

  if (!product || !product.variants.length) {
    throw new AppError(
      "Product or variant not available",
      HTTP_STATUS.NOT_FOUND,
    );
  }

  const variant = product.variants[0];

  // ✅ STOCK CHECK
  if (quantity > variant.stock) {
    throw new AppError(
      `Only ${variant.stock} items available in stock`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // ✅ REMOVE FROM WISHLIST IF EXISTS
  const wishlist = await Wishlist.findOne({ userId });

  let removedFromWishlist = false;

  if (wishlist) {
    const index = wishlist.items.findIndex(
      (item) =>
        item.productId.equals(productObjId) &&
        item.variantId.equals(variantObjId),
    );

    if (index !== -1) {
      wishlist.items.splice(index, 1);
      await wishlist.save();
      removedFromWishlist = true;
    }
  }

  let cart = await Cart.findOne({ userId });

  // ✅ CREATE CART
  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [
        {
          productId: productObjId,
          variantId: variantObjId,
          quantity,
        },
      ],
    });

    return {
      status: HTTP_STATUS.CREATED,
      added: true,
      removedFromWishlist,
      message: "Added to cart",
      cartCount: 1,
    };
  }

  let added = false;
  let message = "";

  const existingItem = cart.items.find(
    (item) =>
      item.productId.equals(productObjId) &&
      item.variantId.equals(variantObjId),
  );

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;

    // ✅ MAX LIMIT CHECK
    if (newQty > MAX_QTY) {
      throw new AppError(
        "Maximum 3 items allowed per product",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // ✅ STOCK CHECK
    if (newQty > variant.stock) {
      throw new AppError(
        `Only ${variant.stock} items available`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    existingItem.quantity = newQty;
    message = "Product quantity updated!";
    added = false;
  } else {
    cart.items.push({
      productId: productObjId,
      variantId: variantObjId,
      quantity,
    });
    message = "Product added to cart!";
    added = true;
  }

  await cart.save();

  return {
    status: HTTP_STATUS.OK,
    added,
    removedFromWishlist,
    message,
    cartCount: cart.items.length,
  };
};
