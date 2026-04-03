import HTTP_STATUS from "../../constant/statusCode.js";
import renderView from "../../utils/admin/renderView.util.js";

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
  getProductByIdService,
  getVariantByIdService,
  checkSkuAvailabilityService,
} from "../../services/product/product.service.js";

import {
  addVariantImageService,
  deleteVariantImageService,
  replaceVariantImageService,
} from "../../services/product/variantImage.service.js";

import {
  errorResponse,
  successResponse,
} from "../../utils/partials/response.util.js";

import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../services/partials/cloudinary.service.js";
import AppError from "../../utils/partials/AppError.utils.js";
import { deleteCacheByPattern } from "../../utils/Redis/cache.js";

//  PRODUCTS PAGE
export const productsPage = async (req, res, next) => {
  try {
    //pagination
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 6;

    //filters
    const search = (req.query.search || "").trim();
    const status = req.query.status || "All";

    //service call
    const { products, currentPage, categories, brands, totalPages } =
      await getProductsService({
        page,
        limit,
        search,
        status,
      });

    //AJAX request detection (BEST WAY)
    const isAjax =
      req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";

    if (isAjax) {
      const rows = await renderView(res, "admin/home/partials/productRows", {
        products,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        rows,
        pagination,
      });
    }

    // normal render
    res.locals.title = "Products Management";

    const error = req.cookies.toastError || null;

    return res.status(HTTP_STATUS.OK).render("admin/home/products", {
      products,
      categories,
      brands,
      currentPage,
      totalPages,
      error,
    });
  } catch (error) {
    next(error);
  }
};

//  CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    const product = await createProductService(req.body);

    successResponse(
      res,
      "Product created successfully",
      HTTP_STATUS.CREATED,
      product,
    );
  } catch (error) {
    console.error("Create product Error:", error);
    return next(error);
  }
};

//  UPDATE PRODUCT
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await updateProductService(id, req.body);

    // CACHE INVALIDATION
    // category-based cache
    await deleteCacheByPattern(`shop:*category=${product.category}*`);
    // brand-based cache
    await deleteCacheByPattern(`shop:*brand=${product.brand}*`);
    // global listing
    await deleteCacheByPattern(`shop:category=all:*`);
    // home
    await deleteCacheByPattern("home_products_*");

    return successResponse(
      res,
      "Product updated successfully",
      HTTP_STATUS.OK,
      { product },
    );
  } catch (error) {
    console.error("Update Product Error", error);
    next(error);
  }
};

//  DELETE PRODUCT
export const deleteProduct = async (req, res, next) => {
  try {
    const { id, category, brand } = await deleteProductService(req.params.id);

    // CACHE INVALIDATION
    // category-based cache
    await deleteCacheByPattern(`shop:*category=${category}*`);
    // brand-based cache
    await deleteCacheByPattern(`shop:*brand=${brand}*`);
    // global listing
    await deleteCacheByPattern(`shop:category=all:*`);
    // home cache
    await deleteCacheByPattern("home_products_*");

    return successResponse(
      res,
      "Product deleted successfully",
      HTTP_STATUS.OK,
      { id },
    );
  } catch (error) {
    console.error("Delete Product Error", error);
    next(error);
  }
};

//  TOGGLE STATUS
export const toggleProductStatus = async (req, res, next) => {
  try {
    const { status, category, brand } = await toggleProductStatusService(
      req.params.id,
    );

    //CACHE INVALIDATION
    // category-related
    await deleteCacheByPattern(`shop:*category=${category}*`);
    // brand-related
    await deleteCacheByPattern(`shop:*brand=${brand}*`);
    // global listing
    await deleteCacheByPattern(`shop:category=all:*`);
    // home cache
    await deleteCacheByPattern("home_products_*");

    return successResponse(res, "Toggle Updated!", HTTP_STATUS.OK, {
      action: status,
    });
  } catch (error) {
    next(error);
  }
};

//  GET ATTRIBUTES
export const getAttributes = async (req, res, next) => {
  try {
    const attributes = await getProductAttributesService(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      productAttributes: attributes,
    });
  } catch (error) {
    console.error("Get Attributes Error", error);
    next(error);
  }
};

// GET PRODUCT DATA
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await getProductByIdService(id);

    if (!product) {
      return errorResponse(res, "Product not found", HTTP_STATUS.NOT_FOUND);
    }

    return successResponse(
      res,
      "Product fetched successfully",
      HTTP_STATUS.OK,
      product,
    );
  } catch (error) {
    console.error("Get Product By Id Error", error);
    next(error);
  }
};

//GET VARIANT DATA
export const getVariantById = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;

    const variant = await getVariantByIdService(productId, variantId);

    return successResponse(
      res,
      "Variant fetched successfully",
      HTTP_STATUS.OK,
      { variant },
    );
  } catch (error) {
    console.error("Get Variant by id Error", error);
    next(error);
  }
};

//  PRODUCT DETAILS
export const getProductDetails = async (req, res, next) => {
  try {
    const data = await getProductDetailsService(req.params.id, res);

    res.status(HTTP_STATUS.OK).render("admin/home/productDetails", {
      title: "Product Details",
      ...data,
    });
  } catch (error) {
    console.error("Get Product Details Page Error", error);
    next(error);
  }
};

//  VARIANTS
export const addVariant = async (req, res, next) => {
  try {
    const productId = req.params.id;

    let { sku, price, stock, description, attributes } = req.body;

    if (typeof attributes === "string") {
      attributes = JSON.parse(attributes);
    }

    const files = req.files || [];

    const result = await addVariantService({
      productId,
      sku,
      price,
      stock,
      description,
      attributes,
      files,
    });

    return successResponse(res, result.message, HTTP_STATUS.CREATED, {
      variant: result.variant,
    });
  } catch (error) {
    console.error("Delete Product Error", error);
    next(error);
  }
};

export const editVariant = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;

    let { attributes } = req.body;

    if (typeof attributes === "string") {
      attributes = JSON.parse(attributes);
    }

    if (attributes) {
      req.body.attributes = attributes;
    }

    await editVariantService(productId, variantId, {
      ...req.body,
      images: req.files,
    });

    successResponse(res, "Variant updated successfully");
  } catch (error) {
    console.error("Edit Variant Product Error", error);
    next(error);
  }
};

export const deleteVariant = async (req, res, next) => {
  try {
    await deleteVariantService(req.params.variantId);

    successResponse(res, "Variant deleted successfully");
  } catch (error) {
    console.error("Delete Product Error", error);
    next(error);
  }
};

// Image Adding
export const addVariantImage = async (req, res, next) => {
  let uploadedImage;

  try {
    const { productId, variantId } = req.params;

    const file = req.file || req.files?.[0];

    if (!file) {
      return errorResponse(res, "Image required", HTTP_STATUS.BAD_REQUEST);
    }

    // upload to cloudinary
    uploadedImage = await uploadToCloudinary(file.buffer, "variants");

    const result = await addVariantImageService({
      productId,
      variantId,
      image: uploadedImage.secure_url,
      imageId: uploadedImage.public_id,
    });

    return successResponse(
      res,
      result?.message || "Variant image added",
      HTTP_STATUS.OK,
      {
        image: uploadedImage.secure_url,
        imageId: uploadedImage.public_id,
      },
    );
  } catch (error) {
    // 🔥 rollback (same as createBrand)
    if (uploadedImage?.public_id) {
      try {
        await deleteFromCloudinary(uploadedImage.public_id);
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }

    console.error("addvariant img error:", error);
    next(error);
  }
};

// Delete Image
export const deleteVariantImage = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const { imageId } = req.body;

    if (!imageId) {
      throw new AppError("Image ID is required", HTTP_STATUS.BAD_REQUEST);
    }

    const result = await deleteVariantImageService({
      productId,
      variantId,
      imageId,
    });

    return successResponse(res, result.message);
  } catch (error) {
    next(error); // 🔥 pass to global handler
  }
};

export const replaceVariantImage = async (req, res, next) => {
  let uploadedImage;

  try {
    const { productId, variantId } = req.params;
    const { imageId } = req.body;

    const file = req.file || req.files?.[0];

    if (!file) {
      return errorResponse(res, "Image required", HTTP_STATUS.BAD_REQUEST);
    }

    if (!imageId) {
      return errorResponse(
        res,
        "Old imageId required",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // ✅ upload new image (same as your add)
    uploadedImage = await uploadToCloudinary(file.buffer, "variants");

    // ✅ call service (replace logic)
    const result = await replaceVariantImageService({
      productId,
      variantId,
      oldImageId: imageId,
      newImage: uploadedImage.secure_url,
      newImageId: uploadedImage.public_id,
    });

    return successResponse(
      res,
      result?.message || "Variant image replaced",
      HTTP_STATUS.OK,
      {
        image: uploadedImage.secure_url,
        imageId: uploadedImage.public_id,
      },
    );
  } catch (error) {
    // 🔥 rollback (same pattern you used)
    if (uploadedImage?.public_id) {
      try {
        await deleteFromCloudinary(uploadedImage.public_id);
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }

    console.error("replace variant img error:", error);
    next(error);
  }
};

//Check SKU
export const checkSkuAvailability = async (req, res, next) => {
  try {
    const { sku } = req.query;

    const available = await checkSkuAvailabilityService(sku);

    successResponse(res, 'It"s Ok', HTTP_STATUS.OK, { available });
  } catch (error) {
    console.error("check sku error:", error);
    return next(error);
  }
};
