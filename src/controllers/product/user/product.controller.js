import { getFilterDataService, getProductsListService } from "../../../services/product/product.service.js";
import renderView from "../../../utils/admin/renderView.util.js";

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
    const { variant_id } = req.body;

    // dummy toggle logic
    const added = true;

    return res.json({
      success: true,
      added,
      message: added ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
