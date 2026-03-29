import {
  getFilterDataService,
  getProductsListService,
  getProductDetailsServiceUser,
} from "../../../services/product/product.service.js";

import { updateWishlistService } from "../../../services/product/wishlist.service.js";

import renderView from "../../../utils/admin/renderView.util.js";

import { successResponse } from "../../../utils/partials/response.util.js";

import AppError from "../../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../../constant/statusCode.js";
import {
  removeCartItemService,
  updateCartQuantityService,
  updateCartService,
} from "../../../services/product/cart.service.js";
import setCookieMSG from "../../../utils/partials/setCookieMsg.utils.js";
import Wishlist from "../../../models/wishlistSchema.model.js";
import Cart from "../../../models/cartSchema.models.js";
import Product from "../../../models/productSchema.model.js";

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

export const updateWishlist = async (req, res, next) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError("User not found! Please login first.", 401);
    }

    const result = await updateWishlistService({
      userId,
      productId,
      variantId,
    });

    if (!result.success) {
      throw new AppError(result.message, result.status || 400);
    }

    return successResponse(res, result.message, HTTP_STATUS.OK, result);
  } catch (err) {
    next(err); // clean
  }
};

export const getWishlistStatus = async (req, res) => {
  try {
    const { productId, variantId } = req.query;
    const userId = res.locals.user?._id;

    if (!userId) {
      return res.json({ inWishlist: false });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.json({ inWishlist: false });
    }

    const exists = wishlist.items.some(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId,
    );

    return res.json({ inWishlist: exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ inWishlist: false });
  }
};

export const getCartStatus = async (req, res, next) => {
  try {
    const { productId, variantId } = req.query;
    const userId = res.locals.user?._id;

    if (!userId) {
      return res.json({ inCart: false });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.json({ inCart: false });
    }

    const exists = cart.items.some(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId,
    );

    return res.json({ inCart: exists });
  } catch (error) {
    next(error);
  }
};

export const updateCart = async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("User not found", HTTP_STATUS.UNAUTHORIZED));
    }

    const { sataus, added, message, removedFromWishlist } =
      await updateCartService({
        userId,
        productId,
        variantId,
        quantity,
      });

    successResponse(res, message, sataus, { added, removedFromWishlist });
  } catch (error) {
    return next(error); // ONLY this
  }
};

export const getProductDetailsUser = async (req, res) => {
  try {
    const { id } = req.params;

    const datas = await getProductDetailsServiceUser(id);

    res.render("user/home/productDetails", { ...datas });
  } catch (error) {
    setCookieMSG(res, error.message);

    res.redirect("/shop");
  }
};

//Cart Page
export const getCartPage = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(
        new AppError("Please login to view cart", HTTP_STATUS.UNAUTHORIZED),
      );
    }

    let cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        select: "name brand variants",
        populate: {
          path: "brand",
          select: "name",
        },
      })
      .lean();

    if (!cart) {
      cart = { items: [] };
    }

    cart.items = (cart.items || [])
      .map((item) => {
        const product = item.productId;

        if (!product) return null;

        // 🔍 find matching variant inside product
        const variant = product.variants.find(
          (v) => v._id.toString() === item.variantId.toString(),
        );

        if (!variant) return null;

        return {
          ...item,
          variantId: {
            ...variant,

            // normalize images for frontend
            images: variant.product_images?.map((img) => img.url) || [],
          },
        };
      })
      .filter(Boolean);

    res.render("user/home/cart", { cart });
  } catch (error) {
    console.error("Cart Page Error:", error);
    next(error);
  }
};

//Cart Quantity Update
export const updateCartQuantity = async (req, res, next) => {
  try {
    const userId = res.locals.user?._id;
    const { itemId, quantity } = req.body;

    const data = await updateCartQuantityService(userId, itemId, quantity);

    successResponse(res, data.message, data.status, data);
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const userId = res.locals.user?._id;
    const { itemId } = req.body;

    const data = await removeCartItemService(userId, itemId);

    successResponse(res, "Item removed from cart", HTTP_STATUS.OK, data);
  } catch (error) {
    next(error);
  }
};
