import renderView from "../../utils/admin/renderView.util.js";

import {
  brandService,
  createBrandService,
  findBrandByIdService,
  softDeleteBrandService,
  toggleBrandStatusService,
  updateBrandService,
} from "../../services/product/brand.service.js";

import {
  errorResponse,
  successResponse,
} from "../../utils/partials/response.util.js";

import HTTP_STATUS from "../../constant/statusCode.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../services/partials/cloudinary.service.js";
import { deleteCacheByPattern } from "../../utils/Redis/cache.js";

export const brandPage = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 5;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const { brands, currentPage, totalPages } = await brandService({
      limit,
      page,
      search,
      status,
    });

    // AJAX request
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/brandRows", {
        brands,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.json({ rows, pagination });
    }

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

export const createBrand = async (req, res) => {
  let uploadedImage;

  try {
    const { title, status } = req.body;

    if (!req.file) {
      return errorResponse(res, "Logo required", HTTP_STATUS.BAD_REQUEST);
    }

    //upload first
    uploadedImage = await uploadToCloudinary(req.file.buffer, "brand");

    const brand = await createBrandService({
      title,
      status,
      logo: uploadedImage.secure_url,
      brandId: uploadedImage.public_id,
    });

    // CACHE INVALIDATION
    await deleteCacheByPattern(`shop:category=all:*`);
    await deleteCacheByPattern("home_products_*");

    return successResponse(
      res,
      "Brand created successfully",
      HTTP_STATUS.CREATED,
      brand,
    );
  } catch (error) {
    // rollback image
    if (uploadedImage?.public_id) {
      await deleteFromCloudinary(uploadedImage.public_id);
    }

    return errorResponse(
      res,
      error.message || "Failed to create brand",
      error.statusCode || 500,
    );
  }
};

export const updateBrand = async (req, res) => {
  let uploadedImage;

  try {
    const { id } = req.params;
    const { title } = req.body;

    const brand = await findBrandByIdService(id);

    if (!brand) {
      return errorResponse(res, "Brand not found", HTTP_STATUS.NOT_FOUND);
    }

    let logo = brand.logo;
    let brandId = brand.brandId;

    // upload new image
    if (req.file) {
      uploadedImage = await uploadToCloudinary(req.file.buffer, "brand");

      logo = uploadedImage.secure_url;
      brandId = uploadedImage.public_id;
    }

    // update DB
    const updatedBrand = await updateBrandService(id, {
      title,
      logo,
      brandId,
    });

    // delete OLD image AFTER success
    if (req.file && brand?.brandId) {
      await deleteFromCloudinary(brand.brandId);
    }

    // CACHE INVALIDATION
    await deleteCacheByPattern(`shop:*brand=${id}*`);
    await deleteCacheByPattern(`shop:category=*`);
    await deleteCacheByPattern("home_products_*");

    return successResponse(
      res,
      "Brand updated successfully",
      HTTP_STATUS.OK,
      updatedBrand,
    );
  } catch (error) {
    // rollback new image if DB failed
    if (uploadedImage?.public_id) {
      await deleteFromCloudinary(uploadedImage.public_id);
    }

    return errorResponse(
      res,
      error.message || "Failed to update brand",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await softDeleteBrandService(id);

    // CACHE INVALIDATION
    await deleteCacheByPattern(`shop:*brand=${id}*`);
    await deleteCacheByPattern(`shop:category=*`);
    await deleteCacheByPattern("home_products_*");

    return successResponse(res, "Brand deleted successfully", HTTP_STATUS.OK, {
      id: brand._id,
    });
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      error.message || "Failed to delete brand",
      error.statusCode || 500,
    );
  }
};

export const toggleBrandStatus = async (req, res) => {
  try {
    const { status, id } = await toggleBrandStatusService(req.params.id);

    //CACHE INVALIDATION
    await deleteCacheByPattern(`shop:*brand=${id}*`);
    await deleteCacheByPattern(`shop:category=*`);
    await deleteCacheByPattern("home_products_*");

    return successResponse(
      res,
      "Brand status updated successfully",
      HTTP_STATUS.OK,
      { status },
    );
  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      error.message || "Failed to update brand status",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
