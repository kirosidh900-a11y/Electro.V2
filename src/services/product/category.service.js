import Category from "../../models/CategorySchema.model.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import AppError from "../../utils/partials/AppError.utils.js";
import mongoose from "mongoose";

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
  if (!title || !title.trim()) {
    throw new AppError("Category title is required", HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedTitle = title.trim().toUpperCase();

  const existing = await Category.findOne({ title: normalizedTitle });

  if (existing) {
    throw new AppError("Category already exists", HTTP_STATUS.CONFLICT);
  }

  return await Category.create({
    title: normalizedTitle,
    status,
  });
};

//    Edit Category
export const editCategoryService = async (id, title, status) => {
  if (!title || !title.trim()) {
    throw new AppError("Category title is required", HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedTitle = title.trim().toUpperCase();

  // check duplicate EXCLUDING current category
  const existing = await Category.findOne({
    title: normalizedTitle,
    _id: { $ne: id },
  });

  if (existing) {
    throw new AppError("Category already exists", HTTP_STATUS.CONFLICT);
  }

  // update
  const category = await Category.findByIdAndUpdate(
    id,
    { title: normalizedTitle, status },
    { new: true },
  );

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  return category;
};

//    Delete Category
export const deleteCategoryService = async (id) => {
  //validate id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Category ID", HTTP_STATUS.BAD_REQUEST);
  }

  const category = await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  return {
    id: category._id,
  };
};

//    Toggle Status
export const toggleCategoryService = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Category ID", HTTP_STATUS.BAD_REQUEST);
  }

  const category = await Category.findById(id);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  const updated = await Category.findByIdAndUpdate(
    id,
    {
      status: category.status === "listed" ? "unlisted" : "listed",
    },
    { new: true },
  );

  return {
    id: updated._id,
    status: updated.status,
  };
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
    throw new AppError("Attribute not found", HTTP_STATUS.NOT_FOUND);
  }
};

//    Update Attribute
export const updateAttributeService = async (categoryId, originalKey, updatedAttribute) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND);
  }

  const attrIndex = category.attributes.findIndex(attr => attr.key === originalKey);

  if (attrIndex === -1) {
    throw new AppError("Attribute not found", HTTP_STATUS.NOT_FOUND);
  }

  const newKey = updatedAttribute.key.trim().toLowerCase();
  const newLabel = updatedAttribute.label.trim().toLowerCase();

  // Check if new key/label conflicts with other attributes (excluding current one)
  const exists = category.attributes.some(
    (attr, index) =>
      index !== attrIndex &&
      (attr.key.toLowerCase() === newKey || attr.label.toLowerCase() === newLabel)
  );

  if (exists) {
    throw new AppError(
      "Attribute key or label already exists",
      HTTP_STATUS.CONFLICT
    );
  }

  // Update the attribute
  category.attributes[attrIndex] = {
    ...category.attributes[attrIndex],
    ...updatedAttribute,
    key: newKey,
    label: updatedAttribute.label.trim()
  };

  await category.save();
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
