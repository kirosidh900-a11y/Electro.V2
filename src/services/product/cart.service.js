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

  // ================= FETCH PRODUCT =================
  const product = await Products.findOne(
    {
      _id: productObjId,
      isDeleted: false,
      status: "listed",
      "variants._id": variantObjId,
    },
    {
      "variants.$": 1,
    },
  );

  if (!product || !product.variants.length) {
    throw new AppError(
      "Product or variant not available",
      HTTP_STATUS.NOT_FOUND,
    );
  }

  const variant = product.variants[0];

  // ================= STOCK CHECK =================
  if (quantity > variant.stock) {
    throw new AppError(
      `Only ${variant.stock} items available in stock`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  let cart = await Cart.findOne({ userId });
  let added = false;
  let message = "";
  let removedFromWishlist = false;
  let isNewCart = false;

  // ================= CREATE CART =================
  if (!cart) {
    cart = new Cart({
      userId,
      items: [
        {
          productId: productObjId,
          variantId: variantObjId,
          quantity,
        },
      ],
    });

    added = true;
    message = "Product added to cart!";
    isNewCart = true;
  }

  // ================= UPDATE CART =================
  else {
    const existingItem = cart.items.find(
      (item) =>
        item.productId.equals(productObjId) &&
        item.variantId.equals(variantObjId),
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (newQty > MAX_QTY) {
        throw new AppError(
          "Maximum 3 items allowed per product",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

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
      if (cart.items.length >= 5) {
        throw new AppError(
          "Maximum 5 different products allowed in cart",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      cart.items.push({
        productId: productObjId,
        variantId: variantObjId,
        quantity,
      });

      message = "Product added to cart!";
      added = true;
    }
  }

  // ================= SAVE CART FIRST =================
  await cart.save();

  // ================= REMOVE FROM WISHLIST (SAFE) =================
  const wishlist = await Wishlist.findOne({ userId });

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

  // ================= FINAL RESPONSE =================
  return {
    status: isNewCart ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    added,
    removedFromWishlist,
    message,
    cartCount: cart.items.length,
  };
};

export const updateCartQuantityService = async (userId, itemId, quantity) => {
  if (!userId) {
    throw new AppError("Please login", 401);
  }

  // FIXED VALIDATION
  if (!itemId || quantity === undefined || quantity === null) {
    throw new AppError("Invalid data", 400);
  }

  const qty = Number(quantity);

  if (isNaN(qty)) {
    throw new AppError("Quantity must be a number", 400);
  }

  if (qty < 1) {
    throw new AppError("Minimum quantity is 1", 400);
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const item = cart.items.id(itemId);
  if (!item) throw new AppError("Item not found", 404);

  const product = await Products.findById(item.productId);
  if (!product) throw new AppError("Product not found", 404);

  const variant = product.variants.find(
    (v) => v._id.toString() === item.variantId.toString(),
  );

  if (!variant) throw new AppError("Variant not found", 404);

  if (variant.stock === 0) {
    throw new AppError("Out of stock", 400);
  }

  if (qty > variant.stock) {
    throw new AppError(`Only ${variant.stock} available`, 400);
  }

  const MAX_LIMIT = 3;
  if (qty > MAX_LIMIT) {
    throw new AppError(`Maximum ${MAX_LIMIT} items allowed`, 400);
  }

  item.quantity = qty;
  await cart.save();

  return {
    itemId,
    quantity: qty,
  };
};

export const removeCartItemService = async (userId, itemId) => {
  if (!userId) {
    throw new AppError("Please login", HTTP_STATUS.UNAUTHORIZED);
  }

  if (!itemId) {
    throw new AppError("Invalid itemId", HTTP_STATUS.BAD_REQUEST);
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new AppError("Cart not found", HTTP_STATUS.NOT_FOUND);
  }

  // Find item index
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex === -1) {
    throw new AppError("Item not found in cart", HTTP_STATUS.NOT_FOUND);
  }

  // Remove item
  cart.items.splice(itemIndex, 1);

  await cart.save();

  return {
    itemId,
  };
};

export const validateCartBeforeCheckout = async () => {
  const { userId } = res.locals.user || {};

  if (!userId) {
    throw new AppError("Please login", HTTP_STATUS.UNAUTHORIZED);
  }

  const cart = await Cart.findOne({ userId }).populate("items.productId");

  if (!cart || cart.items.length === 0) {
    throw new AppError("Cart is empty", HTTP_STATUS.BAD_REQUEST);
  }

  for (const item of cart.items) {
    const product = await Products.findById(item.productId);

    const variant = product.variants.find(
      (v) => v._id.toString() === item.variantId.toString(),
    );

    if (!variant || variant.stock === 0) {
      throw new AppError(
        "Remove out of stock items before checkout",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (item.quantity > variant.stock) {
      throw new AppError(
        `Only ${variant.stock} items available`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
  }

  return true;
};

export const validateCartStockService = async (userId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) return [];

  const updates = [];

  for (const item of cart.items) {
    const product = await Products.findById(item.productId);

    const variant = product.variants.find(
      (v) => v._id.toString() === item.variantId.toString(),
    );

    if (!variant) continue;

    updates.push({
      itemId: item._id,
      stock: variant.stock,
      quantity: item.quantity,
      isOutOfStock: variant.stock === 0,
      exceedsStock: item.quantity > variant.stock,
    });
  }

  return updates;
};

export const getWishlistService = async (userId) => {
  const wishlist = await Wishlist.findOne({ userId }).lean();

  if (!wishlist || !wishlist.items.length) {
    return { items: [] };
  }

  //  SORT (NEW → OLD)
  const sortedItems = wishlist.items.sort(
    (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  );

  const populatedItems = await Promise.all(
    sortedItems.map(async (item) => {
      const product = await Products.findById(item.productId)
        .populate("brand", "title")
        .lean();

      if (!product) return null;

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId.toString() && !v.isDeleted,
      );

      if (!variant) return null;

      return {
        productId: {
          _id: product._id,
          name: product.name,
          brand: product.brand,
        },
        variantId: variant,
        addedAt: item.addedAt,
      };
    }),
  );

  return {
    items: populatedItems.filter(Boolean),
  };
};

export const validateCartStockServiceCheck = async (userId) => {

  const cart = await Cart.findOne({ userId })
    .populate("items.productId");

  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Cart is empty" };
  }

  let invalidItems = [];

  cart.items.forEach(item => {
    const product = item.productId;

    // 🔥 find correct variant
    const variant = product.variants.find(
      v => v._id.toString() === item.variantId.toString()
    );

    const stock = variant?.stock ?? 0;

    // ❌ no variant found
    if (!variant) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: "Variant not found"
      });
      return;
    }

    // ❌ out of stock
    if (stock === 0) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: "Out of stock",
        stock,
        quantity: item.quantity
      });
    }

    // ❌ quantity exceeds stock
    else if (item.quantity > stock) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: `Only ${stock} left`,
        stock,
        quantity: item.quantity
      });
    }
  });

  if (invalidItems.length > 0) {
    return {
      success: false,
      items: invalidItems
    };
  }

  return { success: true };
};