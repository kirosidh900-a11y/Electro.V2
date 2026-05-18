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

  // ── Full availability check: product + category + brand + variant ─────────
  const [productDoc] = await Products.aggregate([
    {
      $match: {
        _id: productObjId,
        isDeleted: false,
        status: "listed",
      },
    },
    {
      $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "cat" },
    },
    { $unwind: "$cat" },
    { $match: { "cat.status": "listed", "cat.isDeleted": false } },
    {
      $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brd" },
    },
    { $unwind: "$brd" },
    { $match: { "brd.status": "listed", "brd.isDeleted": false } },
    { $project: { variants: 1 } },
  ]);

  if (!productDoc) {
    throw new AppError("Product is not available", HTTP_STATUS.NOT_FOUND);
  }

  const variant = productDoc.variants.find(
    (v) => v._id.toString() === variantObjId.toString() && !v.isDeleted,
  );

  if (!variant) {
    throw new AppError("Selected variant is not available", HTTP_STATUS.NOT_FOUND);
  }

  // Available stock = stock minus reserved
  const availableStock = Math.max(variant.stock - (variant.reserved || 0), 0);

  if (quantity > availableStock) {
    throw new AppError(
      `Only ${availableStock} item(s) available in stock`,
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

      if (newQty > availableStock) {
        throw new AppError(
          `Only ${availableStock} item(s) available in stock`,
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
    throw new AppError("Please login", HTTP_STATUS.UNAUTHORIZED);
  }

  // FIXED VALIDATION
  if (!itemId || quantity === undefined || quantity === null) {
    throw new AppError("Invalid data", HTTP_STATUS.BAD_REQUEST);
  }

  const qty = Number(quantity);

  if (isNaN(qty)) {
    throw new AppError("Quantity must be a number", HTTP_STATUS.BAD_REQUEST);
  }

  if (qty < 1) {
    throw new AppError("Minimum quantity is 1", HTTP_STATUS.BAD_REQUEST);
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) throw new AppError("Cart not found", HTTP_STATUS.NOT_FOUND);

  const item = cart.items.id(itemId);
  if (!item) throw new AppError("Item not found", HTTP_STATUS.NOT_FOUND);

  const product = await Products.findById(item.productId);
  if (!product || product.isDeleted || product.status !== "listed") {
    throw new AppError("Product is no longer available", HTTP_STATUS.BAD_REQUEST);
  }

  const variant = product.variants.find(
    (v) => v._id.toString() === item.variantId.toString(),
  );

  if (!variant || variant.isDeleted) {
    throw new AppError("Selected variant is no longer available", HTTP_STATUS.BAD_REQUEST);
  }

  // Available stock = stock minus reserved
  const availableStock = Math.max(variant.stock - (variant.reserved || 0), 0);

  if (availableStock === 0) {
    throw new AppError("Out of stock", HTTP_STATUS.BAD_REQUEST);
  }

  const MAX_LIMIT = 3;
  const effectiveLimit = Math.min(MAX_LIMIT, availableStock);

  if (qty > effectiveLimit) {
    // Allow reducing to effectiveLimit — only block if trying to go above it
    throw new AppError(
      availableStock < MAX_LIMIT
        ? `Only ${availableStock} item(s) available in stock`
        : `Maximum ${MAX_LIMIT} items allowed per product`,
      HTTP_STATUS.BAD_REQUEST,
    );
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

    const variant = product?.variants.find(
      (v) => v._id.toString() === item.variantId.toString(),
    );

    if (!variant) continue;

    // 🔥 ALWAYS CALCULATE AVAILABLE
    const availableStock = Math.max(variant.stock - (variant.reserved || 0), 0);

    let reason = null;

    if (availableStock === 0) {
      reason = `${product.name} is out of stock`;
    } else if (item.quantity > availableStock) {
      reason = `Only ${availableStock} available for ${product.name}`;
    }

    updates.push({
      itemId: item._id,

      stock: availableStock,
      quantity: item.quantity,

      isOutOfStock: availableStock === 0,
      exceedsStock: item.quantity > availableStock,

      reason,
    });
  }

  return updates;
};

export const getWishlistService = async (userId, { page = 1, limit = 5 } = {}) => {
  const wishlist = await Wishlist.findOne({ userId }).lean();

  if (!wishlist || !wishlist.items.length) {
    return { items: [], total: 0, totalPages: 0, currentPage: 1 };
  }

  const sortedItems = wishlist.items.sort(
    (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  );

  const total      = sortedItems.length;
  const totalPages = Math.ceil(total / limit);
  const skip       = (page - 1) * limit;
  const pageItems  = sortedItems.slice(skip, skip + limit);

  const populatedItems = await Promise.all(
    pageItems.map(async (item) => {
      const product = await Products.findById(item.productId)
        .populate("brand", "_id title")
        .populate("category", "_id title")
        .lean();

      if (!product) return null;

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId.toString() && !v.isDeleted,
      );

      if (!variant) return null;

      // Apply active offers to get correct pricing
      const { getActiveOffers } = await import("../../utils/products/offers.util.js");
      const { applyPricingToProduct } = await import("../../utils/products/pricing.util.js");

      const offers = await getActiveOffers(product);
      const productWithPricing = applyPricingToProduct(product, offers);

      const pricedVariant = productWithPricing.variants.find(
        (v) => v._id.toString() === item.variantId.toString(),
      ) || variant;

      return {
        productId: {
          _id: product._id,
          name: product.name,
          brand: product.brand,
        },
        variantId: {
          ...pricedVariant,
          images: pricedVariant.product_images?.map((img) => img.url) || [],
        },
        addedAt: item.addedAt,
      };
    }),
  );

  return {
    items: populatedItems.filter(Boolean),
    total,
    totalPages,
    currentPage: page,
  };
};

export const validateCartStockServiceCheck = async (userId) => {
  const cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    populate: [
      { path: "category", select: "status isDeleted title" },
      { path: "brand",    select: "status isDeleted title" },
    ],
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Cart is empty" };
  }

  let invalidItems = [];

  cart.items.forEach((item) => {
    const product = item.productId;

    // ❌ Product deleted or unlisted
    if (!product || product.isDeleted || product.status !== "listed") {
      invalidItems.push({
        itemId: item._id,
        name: product?.name || "Unknown product",
        reason: `${product?.name || "A product"} is no longer available`,
      });
      return;
    }

    // ❌ Category unlisted or deleted
    const cat = product.category;
    if (!cat || cat.isDeleted || cat.status !== "listed") {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: `${product.name} — category is no longer available`,
      });
      return;
    }

    // ❌ Brand unlisted or deleted
    const brand = product.brand;
    if (!brand || brand.isDeleted || brand.status !== "listed") {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: `${product.name} — brand is no longer available`,
      });
      return;
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === item.variantId.toString(),
    );

    // ❌ Variant deleted or not found
    if (!variant || variant.isDeleted) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: "Selected variant is no longer available",
      });
      return;
    }

    // 🔥 CALCULATE AVAILABLE STOCK
    const availableStock = Math.max(variant.stock - (variant.reserved || 0), 0);

    // ❌ OUT OF STOCK
    if (availableStock === 0) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: `${product.name} is out of stock`,
        stock: availableStock,
        quantity: item.quantity,
      });
    }

    // ❌ EXCEEDS AVAILABLE
    else if (item.quantity > availableStock) {
      invalidItems.push({
        itemId: item._id,
        name: product.name,
        reason: `${product.name} has only ${availableStock} items left`,
        stock: availableStock,
        quantity: item.quantity,
      });
    }
  });

  if (invalidItems.length > 0) {
    return { success: false, items: invalidItems };
  }

  return { success: true };
};
