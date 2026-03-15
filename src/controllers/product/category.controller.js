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
  getAttributesService,
} from "../../services/product/category.service.js";

import { successResponse } from "../../utils/partials/response.util.js";

//  Category Page
export const category = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const { totalPages, categories, currentPage } = await getCategoryService({
      page,
      limit,
      search,
      status,
    });

    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/categoryRows", {
        categories,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.json({ rows, pagination });
    }

    res.locals.title = "Category Management";

    res.render("admin/home/category", {
      categories,
      currentPage,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

//  Create Category
export const createCategory = async (req, res, next) => {
  try {
    const { title, status } = req.body;

    const category = await createCategoryService(title, status);

    return successResponse(
      res,
      "Category Successfully Created!",
      HTTP_STATUS.CREATED,
      { category },
    );
  } catch (error) {
    next(error);
  }
};

//  Edit Category
export const editCategory = async (req, res, next) => {
  try {
    const { title } = req.body;
    const id = req.params.id;

    const category = await editCategoryService(id, title);

    return successResponse(res, "Category Updated!", HTTP_STATUS.OK, category);
  } catch (error) {
    next(error);
  }
};

//  Delete Category
export const deleteCategory = async (req, res, next) => {
  try {
    const id = req.params.id;

    await deleteCategoryService(id);

    return successResponse(res, "Category Deleted!", HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

//  Toggle Status
export const toggleCategoryStatus = async (req, res, next) => {
  try {
    const id = req.params.id;

    const status = await toggleCategoryService(id);

    return successResponse(res, "Status Updated!", HTTP_STATUS.OK, { status });
  } catch (error) {
    next(error);
  }
};

//  Add Attribute
export const addCategoryAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const attribute = req.body;

    await addCategoryAttributeService(categoryId, attribute);

    return successResponse(res, "Attribute added successfully");
  } catch (error) {
    next(error);
  }
};

//  Delete Attribute
export const deleteAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const key = decodeURIComponent(req.params.key);

    await deleteAttributeService(categoryId, key);

    return successResponse(res, "Attribute deleted successfully");
  } catch (error) {
    next(error);
  }
};

// Get Attributes
export const getAttributes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await getAttributesService(id);

    return successResponse(res, "Attributes fetched", HTTP_STATUS.OK, data);
  } catch (error) {
    next(error);
  }
};
