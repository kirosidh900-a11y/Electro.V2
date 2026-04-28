import renderView from "../../utils/admin/renderView.util.js";
import HTTP_STATUS from "../../constant/statusCode.js";

import {
  getCategoryService,
  createCategoryService,
  editCategoryService,
  deleteCategoryService,
  toggleCategoryService,
  addCategoryAttributeService,
  deleteAttributeService,
  updateAttributeService,
  getAttributesService,
} from "../../services/product/category.service.js";

import { successResponse } from "../../utils/partials/response.util.js";
import { deleteCacheByPattern } from "../../utils/Redis/cache.js";


// 🔥 COMMON CACHE INVALIDATION (ADMIN + USER)
const clearCategoryCache = async (id = null) => {
  // 🔹 USER SIDE CACHE
  await deleteCacheByPattern("shop:category=all:*");
  await deleteCacheByPattern("shop:products:*");
  await deleteCacheByPattern("home_products_*");

  // 🔹 SPECIFIC CATEGORY CACHE
  if (id) {
    await deleteCacheByPattern(`shop:category=${id}:*`);
  }

  // 🔹 ADMIN SIDE CACHE (if added later)
  await deleteCacheByPattern("admin:category:*");
};



// =====================================================
// ✅ CATEGORY LIST (SSR + AJAX)
// =====================================================
export const category = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 4;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const { totalPages, categories, currentPage } = await getCategoryService({
      page,
      limit,
      search,
      status,
    });

    // 🔥 AJAX SUPPORT
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/categoryRows", {
        categories,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages }
      );

      return res.json({ rows, pagination });
    }

    res.locals.title = "Category Management";

    return res.render("admin/home/category", {
      categories,
      currentPage,
      totalPages,
    });

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ CREATE CATEGORY
// =====================================================
export const createCategory = async (req, res, next) => {
  try {
    const { title, status } = req.body;

    const category = await createCategoryService(title, status);

    // 🔥 CACHE INVALIDATION
    await clearCategoryCache();

    return successResponse(
      res,
      "Category Successfully Created!",
      HTTP_STATUS.CREATED,
      { category }
    );

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ EDIT CATEGORY
// =====================================================
export const editCategory = async (req, res, next) => {
  try {
    const { title, status } = req.body;
    const id = req.params.id;

    const category = await editCategoryService(id, title, status);

    // 🔥 CACHE INVALIDATION
    await clearCategoryCache(id);

    return successResponse(
      res,
      "Category Updated!",
      HTTP_STATUS.OK,
      category
    );

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ DELETE CATEGORY
// =====================================================
export const deleteCategory = async (req, res, next) => {
  try {
    const id = req.params.id;

    await deleteCategoryService(id);

    // 🔥 CACHE INVALIDATION
    await clearCategoryCache(id);

    return successResponse(
      res,
      "Category Deleted!",
      HTTP_STATUS.OK
    );

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ TOGGLE STATUS
// =====================================================
export const toggleCategoryStatus = async (req, res, next) => {
  try {
    const { id, status } = await toggleCategoryService(req.params.id);

    // 🔥 CACHE INVALIDATION
    await clearCategoryCache(id);

    return successResponse(
      res,
      "Status Updated!",
      HTTP_STATUS.OK,
      { status }
    );

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ ADD ATTRIBUTE
// =====================================================
export const addCategoryAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const attribute = req.body;

    await addCategoryAttributeService(categoryId, attribute);

    // 🔥 OPTIONAL CACHE CLEAR
    await clearCategoryCache(categoryId);

    return successResponse(res, "Attribute added successfully");

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ DELETE ATTRIBUTE
// =====================================================
export const deleteAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const key = decodeURIComponent(req.params.key);

    await deleteAttributeService(categoryId, key);

    // 🔥 OPTIONAL CACHE CLEAR
    await clearCategoryCache(categoryId);

    return successResponse(res, "Attribute deleted successfully");

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ UPDATE ATTRIBUTE
// =====================================================
export const updateAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const originalKey = decodeURIComponent(req.params.key);
    const updatedAttribute = req.body;

    await updateAttributeService(categoryId, originalKey, updatedAttribute);

    // 🔥 OPTIONAL CACHE CLEAR
    await clearCategoryCache(categoryId);

    return successResponse(res, "Attribute updated successfully");

  } catch (error) {
    next(error);
  }
};



// =====================================================
// ✅ GET ATTRIBUTES
// =====================================================
export const getAttributes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await getAttributesService(id);

    return successResponse(
      res,
      "Attributes fetched",
      HTTP_STATUS.OK,
      data
    );

  } catch (error) {
    next(error);
  }
};