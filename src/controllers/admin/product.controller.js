import Products from "../../models/productSchema.model.js";
import  Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";

export const productsPage = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    /* ---------- SEARCH ---------- */

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    /* ---------- STATUS FILTER ---------- */

    if (status === "listed") query.status = "listed";
    if (status === "unlisted") query.status = "unlisted";

    /* ---------- COUNT ---------- */

    const totalProducts = await Products.countDocuments(query);

    const totalPages = Math.ceil(totalProducts / limit);

    /* ---------- GET PRODUCTS ---------- */

    const products = await Products.find(query)
      .populate("category", "title")
      .populate("brand", "title")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    /* ---------- DROPDOWNS ---------- */

    const categories = await Category.find({ isDeleted: false });

    const brands = await Brand.find({ isDeleted: false });

    const currentPage = page;

    /* ---------- AJAX (search/pagination) ---------- */

//     if (req.xhr) {

//       const rows = await renderView(
//         res,
//         "admin/home/partials/productRows",
//         { products, currentPage }
//       );

//       const pagination = await renderView(
//         res,
//         "admin/home/partials/pagination",
//         { currentPage, totalPages }
//       );

//       return res.json({ rows, pagination });
//     }

    /* ---------- NORMAL LOAD ---------- */

    res.render("admin/home/products", {
      products,
      categories,
      brands,
      currentPage,
      totalPages,
      title: "Products Management",
    });

  } catch (error) {
    console.log(error);
    next(error);
  }
};