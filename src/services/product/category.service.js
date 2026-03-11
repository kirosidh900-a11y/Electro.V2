import Category from "../../models/CategorySchema.model.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import AppError from "../../utils/partials/AppError.utils.js";


//    Get Categories
export const getCategoryService = async ({ page, limit, search, status }) => {
  const query = { isDeleted: false };

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

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

  return {
    totalPages: Math.ceil(totalCategories / limit),
    categories,
    currentPage: page,
  };
};

//    Create Category
export const createCategoryService = async (title, status) => {
  try {
    return await Category.create({ title, status });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        "Category already exists",
        HTTP_STATUS.CONFLICT,
      );
    }
    throw error;
  }
};

//    Edit Category
export const editCategoryService = async (id, title) => {
  const category = await Category.findByIdAndUpdate(
    id,
    { title },
    { new: true },
  );

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  return category;
};

//    Delete Category
export const deleteCategoryService = async (id) => {
  const category = await Category.findByIdAndUpdate(id, {
    isDeleted: true,
  });

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }
};

//    Toggle Status
export const toggleCategoryService = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  category.status = category.status === "listed" ? "unlisted" : "listed";

  await category.save();
};

//    Add Attribute
export const addCategoryAttributeService = async (categoryId, attribute) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  const key = attribute.key.trim().toLowerCase();
  const label = attribute.label.trim().toLowerCase();

  const exists = category.attributes.some(
    (attr) =>
      attr.key.toLowerCase() === key || attr.label.toLowerCase() === label,
  );

  if (exists) {
    throw new AppError(
      "Attribute key or label already exists",
      HTTP_STATUS.CONFLICT,
    );
  }

  category.attributes.push(attribute);

  await category.save();
};

//    Delete Attribute
export const deleteAttributeService = async (categoryId, key) => {
  const result = await Category.updateOne(
    { _id: categoryId },
    { $pull: { attributes: { key } } },
  );

  if (result.modifiedCount === 0) {
    throw new AppError(
      "Attribute not found",
      HTTP_STATUS.NOT_FOUND,
    );
  }
};

//    Get Attributes
export const getAttributesService = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  const productAttributes = category.attributes.filter(
    (attr) => !attr.is_variant_level,
  );

  const variantAttributes = category.attributes.filter(
    (attr) => attr.is_variant_level,
  );

  return {
    productAttributes,
    variantAttributes,
  };
};