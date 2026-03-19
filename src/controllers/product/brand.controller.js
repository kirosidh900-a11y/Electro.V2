import renderView from "../../utils/admin/renderView.util.js";
import cloudinary from "../../config/cloudinary.js";
import { getPublicId } from "../../utils/partials/cloudinary.util.js";

import {
  brandService,
  createBrandService,
  findBrandByIdService,
  softDeleteBrandService,
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
  try {
    const { title, status } = req.body;

    if (!req.file) {
      return errorResponse(res, "Logo required", HTTP_STATUS.BAD_REQUEST);
    }

    const logo = req.file.path;

    await createBrandService({
      title: title.trim().toUpperCase(),
      status,
      logo,
    });

    return successResponse(res, "Brand created successfully");
  } catch (error) {
    // delete uploaded image if DB failed
    if (req.file) {
      const publicId = getPublicId(req.file.path);
      await cloudinary.uploader.destroy(publicId);
    }

    if (error.code === 11000) {
      return errorResponse(res, "Brand already exists");
    }

    console.error(error);
    return errorResponse(res, "Failed to create brand");
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const brand = await findBrandByIdService(id);

    if (!brand) {
      return errorResponse(res, "Brand not found");
    }

    let logo = brand.logo;
    let brandId = brand.brandId;

    // ✅ Only if new image uploaded
    if (req.file) {
      // delete old image
      if (brand?.brandId) {
        await deleteFromCloudinary(brand.brandId);
      }

      // upload new image
      const result = await uploadToCloudinary(req.file.buffer, "brand");

      logo = result.secure_url;
      brandId = result.public_id;
    }

    await updateBrandService(id, {
      title,
      logo,
      brandId,
    });

    return successResponse(res, "Brand updated successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to update brand");
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await findBrandByIdService(id);

    if (!brand) {
      return errorResponse(res, "Brand not found");
    }

    await softDeleteBrandService(id);

    return successResponse(res, "Brand deleted successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to delete brand");
  }
};

export const toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await findBrandByIdService(id);

    if (!brand) {
      return errorResponse(res, "Brand not found");
    }

    const status = brand.status === "listed" ? "unlisted" : "listed";

    await updateBrandService(id, { status });

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to update brand status");
  }
};
