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
} from "../../services/product/variantImage.service.js";

import {
  errorResponse,
  successResponse,
} from "../../utils/partials/response.util.js";

import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../services/partials/cloudinary.service.js";

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
    console.log("Create product Error:", error);
    return next(error);
  }
};

//  UPDATE PRODUCT
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await updateProductService(id, req.body);

    successResponse(res, "Product updated successfully", HTTP_STATUS.OK, {
      product,
    });
  } catch (error) {
    console.error("Delete Product Error", error);
    next(error);
  }
};

//  DELETE PRODUCT
export const deleteProduct = async (req, res, next) => {
  try {
    await deleteProductService(req.params.id);

    successResponse(res, "Product deleted successfully");
  } catch (error) {
    console.error("Delete Product Error", error);
    next(error);
  }
};

//  TOGGLE STATUS
export const toggleProductStatus = async (req, res, next) => {
  try {
    console.log("Toggle");
    const status = await toggleProductStatusService(req.params.id);

    successResponse(res, "Toggle Updated!", HTTP_STATUS.OK, status);
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
    console.log(id);

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
    const data = await getProductDetailsService(req.params.id);
    console.log(data);

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

    await editVariantService(productId, variantId, req.body);

    successResponse(res, "Variant updated successfully");
  } catch (error) {
    console.error("Delete Product Error", error);
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

    console.error("addvariant img error:", err);
    next(err);
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

//Check SKU
export const checkSkuAvailability = async (req, res, next) => {
  try {
    const { sku } = req.query;

    const available = await checkSkuAvailabilityService(sku);
    console.log(available);
    successResponse(res, 'It"s Ok', HTTP_STATUS.OK, { available });
  } catch (error) {
    console.error("check sku error:", error);
    return next(error); 
  }
};
