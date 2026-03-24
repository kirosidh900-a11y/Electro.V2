import Cart from "../../../models/cartSchema.models.js";
import Wishlist from "../../../models/wishlistSchema.model.js";

import {
  getFilterDataService,
  getProductsListService,
} from "../../../services/product/product.service.js";
import renderView from "../../../utils/admin/renderView.util.js";

import mongoose from "mongoose";

//Product
export const getProductsListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const sort = req.query.sort || "newest";
    const search = req.query.search || "";
    const category = req.query.category || "";
    const brand = req.query.brand || "";
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 100000;

    const { categories, brands } = await getFilterDataService();

    // --- AJAX / API RESPONSE ---
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      const productData = await getProductsListService({
        page,
        limit,
        sort,
        search,
        category,
        brand,
        minPrice,
        maxPrice,
      });

      // We render the partials to strings to send back to the frontend
      const cardsHtml = await renderView(
        res,
        "user/home/partials/productCards",
        { products: productData.products },
      );

      const paginationHtml = await renderView(
        res,
        "user/home/partials/pagination",
        { currentPage: page, totalPages: productData.totalPages },
      );

      const sidebar = await renderView(
        res,
        "user/home/partials/productSidebar",
        {
          categories,
          brands,
          minPrice,
          maxPrice,
        },
      );

      return res.json({
        success: true,
        cards: cardsHtml,
        sidebar,
        pagination: paginationHtml,
        totalProducts: productData.total,
        currentCount: productData.products.length,
      });
    }

    // --- INITIAL PAGE LOAD ---
    res.render("user/home/shop", {
      products: undefined,
      totalProducts: undefined,
      totalPages: undefined,
      currentPage: page,
      perPage: limit,
      sort,
      searchQuery: search,
      selectedCategory: category,
      selectedBrand: brand,
      minPrice,
      maxPrice,
      categories: categories,
      brands: brands,
    });
  } catch (error) {
    console.error("Shop Controller Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user._id;

    console.log(userId, productId, variantId);

    const productObjId = new mongoose.Types.ObjectId(productId);
    const variantObjId = new mongoose.Types.ObjectId(variantId);

    const wishlist = await Wishlist.findOne({ userId });

    const exists = wishlist?.items?.some(
      (item) =>
        item.productId.equals(productObjId) &&
        item.variantId.equals(variantObjId),
    );

    let added;

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
      added = false;
    } else {
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
      added = true;
    }

    return res.json({
      success: true,
      added,
      message: added ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user._id;

    const productObjId = new mongoose.Types.ObjectId(productId);
    const variantObjId = new mongoose.Types.ObjectId(variantId);

    let cart = await Cart.findOne({ userId });

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

      return res.json({
        success: true,
        message: "Added to cart",
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.productId.equals(productObjId) &&
        item.variantId.equals(variantObjId),
    );

    if (existingItem) {
      // ✅ Update quantity
      existingItem.quantity += quantity;
    } else {
      // ✅ Add new item
      cart.items.push({
        productId: productObjId,
        variantId: variantObjId,
        quantity,
      });
    }

    await cart.save();

    return res.json({
      success: true,
      message: "Cart updated",
    });
  } catch (err) {
    console.error("Cart Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
