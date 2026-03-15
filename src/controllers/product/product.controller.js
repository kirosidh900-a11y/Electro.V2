import HTTP_STATUS from "../../constant/statusCode.js";
import renderView from "../../utils/admin/renderView.util.js";
import cloudinary from "../../config/cloudinary.js";
import { getPublicId } from "../../utils/partials/cloudinary.util.js";

import {
  getProductsService,
  createProductService,
  updateProductService,
  deleteProductService,
  toggleProductStatusService,
  getProductAttributesService,
  getProductDetailsService,
  addVariantService,
  editVariantService,
  deleteVariantService,
} from "../../services/product/product.service.js";

import {
  addVariantImageService,
  deleteVariantImageService,
} from "../../services/product/variantImage.service.js";

import {
  errorResponse,
  successResponse,
} from "../../utils/partials/response.util.js";

//  PRODUCTS PAGE
export const productsPage = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const { products, currentPage, categories, brands, totalPages } =
      await getProductsService({ page, limit, search, status });

    if (req.headers.accept?.includes("application/json")) {
      const rows = await renderView(res, "admin/home/partials/productRows", {
        products,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.status(HTTP_STATUS.OK).json({ rows, pagination });
    }

    res.locals.title = "Products Management";
    res.status(HTTP_STATUS.OK).render("admin/home/products", {
      products,
      categories,
      brands,
      currentPage,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

//  CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    const product = await createProductService(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

//  UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await updateProductService(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

//  DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    await deleteProductService(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

//  TOGGLE STATUS
export const toggleProductStatus = async (req, res) => {
  try {
    const status = await toggleProductStatusService(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

//  GET ATTRIBUTES
export const getAttributes = async (req, res) => {
  try {
    const attributes = await getProductAttributesService(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      productAttributes: attributes,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

//  PRODUCT DETAILS
export const getProductDetails = async (req, res, next) => {
  try {
    const data = await getProductDetailsService(req.params.id);

    res.status(HTTP_STATUS.OK).render("admin/home/productDetails", {
      title: "Product Details",
      ...data,
    });
  } catch (error) {
    return res.redirect("/admin/products");
  }
};

//  VARIANTS
export const addVariant = async (req, res) => {
  try {
    await addVariantService(req.params.id, req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Variant added successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const editVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    await editVariantService(productId, variantId, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Variant updated successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    await deleteVariantService(req.params.variantId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// Image Adding
export const addVariantImage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const file = req.file || req.files?.[0];

    if (!file) {
      return errorResponse(res, "Image required", HTTP_STATUS.BAD_REQUEST);
    }

    const imagePath = file.path;

    const result = await addVariantImageService({
      productId,
      variantId,
      imagePath,
    });

    return successResponse(res, result.message, HTTP_STATUS.OK, {
      image: result.image,
    });
  } catch (error) {
    const file = req.file || req.files?.[0];

    if (file) {
      const publicId = getPublicId(file.path);
      await cloudinary.uploader.destroy(publicId);
    }

    return errorResponse(res, error.message || "Upload failed");
  }
};

// Delete Image
export const deleteVariantImage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { imagePath } = req.body;

    if (!imagePath) {
      return errorResponse(res, "Image path required", HTTP_STATUS.BAD_REQUEST);
    }

    const public_id = getPublicId(imagePath);

    const result = await deleteVariantImageService({
      productId,
      variantId,
      public_id,
    });

    return successResponse(res, result.message);
  } catch (error) {
    return errorResponse(res, error.message || "Delete failed");
  }
};
