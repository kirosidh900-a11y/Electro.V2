import BrandSchema from "../../models/brandSchema.model.js";
import mongoose from "mongoose";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const brandService = async ({ limit, page, search, status }) => {
  const query = { isDeleted: false };

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  // 📌 Status filter
  if (status === "listed") query.status = "listed";
  if (status === "unlisted") query.status = "unlisted";

  const [totalBrands, brands] = await Promise.all([
    BrandSchema.countDocuments(query),
    BrandSchema.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalBrands / limit);

  const currentPage = page;

  return { totalPages, brands, currentPage };
};

export const findBrandByIdService = async (id) => {
  return BrandSchema.findById(id);
};

export const createBrandService = async ({ title, status, logo, brandId }) => {
  try {
    // validation
    if (!title || !title.trim()) {
      throw new AppError("Brand title is required", HTTP_STATUS.BAD_REQUEST);
    }

    const normalizedTitle = title.trim().toUpperCase();

    // pre-check (better UX)
    const existing = await BrandSchema.findOne({
      title: normalizedTitle,
    });

    if (existing) {
      throw new AppError("Brand already exists", HTTP_STATUS.CONFLICT);
    }

    // create
    const brand = await BrandSchema.create({
      title: normalizedTitle,
      status,
      logo,
      brandId,
    });

    return brand;
  } catch (error) {
    // DB fallback
    if (error.code === 11000) {
      throw new AppError("Brand already exists", HTTP_STATUS.CONFLICT);
    }

    throw error;
  }
};

export const updateBrandService = async (id, data) => {
  // validate id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Brand ID", HTTP_STATUS.BAD_REQUEST);
  }

  // normalize title
  if (data.title) {
    data.title = data.title.trim().toUpperCase();

    // duplicate check (exclude current brand)
    const existing = await BrandSchema.findOne({
      title: data.title,
      _id: { $ne: id },
    });

    if (existing) {
      throw new AppError("Brand already exists", HTTP_STATUS.CONFLICT);
    }
  }

  const updated = await BrandSchema.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw new AppError("Brand not found", HTTP_STATUS.NOT_FOUND);
  }

  return updated;
};

export const softDeleteBrandService = async (id) => {
  // validate id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Brand ID", HTTP_STATUS.BAD_REQUEST);
  }

  const brand = await BrandSchema.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!brand) {
    throw new AppError("Brand not found", HTTP_STATUS.NOT_FOUND);
  }

  return brand;
};

export const toggleBrandStatusService = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Brand ID", HTTP_STATUS.BAD_REQUEST);
  }

  const brand = await BrandSchema.findById(id);

  if (!brand) {
    throw new AppError("Brand not found", HTTP_STATUS.NOT_FOUND);
  }

  brand.status = brand.status === "listed" ? "unlisted" : "listed";

  await brand.save();

  return {
    id: brand._id,
    status: brand.status,
  };
};
