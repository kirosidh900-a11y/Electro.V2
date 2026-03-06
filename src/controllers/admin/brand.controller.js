import renderView from "../../utils/admin/renderView.util.js";
import BrandSchema from "../../models/brandSchema.model.js";

export const brandPage = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // 📌 Status filter
    if (status === "listed") query.status = "listed";
    if (status === "unlisted") query.status = "unlisted";

    const totalBrands = await BrandSchema.countDocuments(query);

    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await BrandSchema.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const currentPage = page;

    // Normal page load
    res.render("admin/home/brand", {
      brands,
      currentPage,
      totalPages,
      title: "Brand Management",
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// //Category CRUD Start Hear
// export const category = async (req, res) => {
//   try {
//     const page = Number(req.query.page) || 1;
//     const limit = 6;

//     const search = req.query.search || "";
//     const status = req.query.status || "All";

//     const query = { isDeleted: false };

//     // 🔎 Search
//     if (search) {
//       query.title = { $regex: search, $options: "i" };
//     }

//     // 📌 Status filter
//     if (status === "listed") query.status = "listed";
//     if (status === "unlisted") query.status = "unlisted";

//     const totalCategories = await Category.countDocuments(query);

//     const totalPages = Math.ceil(totalCategories / limit);

//     const categories = await Category.find(query)
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const currentPage = page;

//     // AJAX request
//     if (req.xhr) {
//       const rows = await renderView(res, "admin/home/partials/categoryRows", {
//         categories,
//         currentPage,
//       });

//       const pagination = await renderView(
//         res,
//         "admin/home/partials/pagination",
//         { currentPage, totalPages },
//       );

//       return res.json({ rows, pagination });
//     }

//     // Normal page load
//     res.render("admin/home/category", {
//       categories,
//       currentPage,
//       totalPages,
//       title: "Category Management",
//     });
//   } catch (error) {
//     res.json({ success: false, message: error.message });
//   }
// };
 
