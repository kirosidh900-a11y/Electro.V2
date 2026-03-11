import Category from "../../models/CategorySchema.model.js";

export const getCategoryService = async ({ page, limit, search, status }) => {
  const query = { isDeleted: false };

  // 🔎 Search
  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  // 📌 Status filter
  if (status === "listed") query.status = "listed";
  if (status === "unlisted") query.status = "unlisted";

  const [totalCategories, categories] = await Promise.all([
    Category.countDocuments(query),
    Category.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCategories / limit);
  return { totalPages, categories, currentPage: page };
};
