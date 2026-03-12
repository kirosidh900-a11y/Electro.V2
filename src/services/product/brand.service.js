import BrandSchema from "../../models/brandSchema.model.js";

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

export const createBrandService = async (data) => {
  return BrandSchema.create(data);
};

export const updateBrandService = async (id, data) => {
  return BrandSchema.findByIdAndUpdate(id, data, { new: true });
};

export const softDeleteBrandService = async (id) => {
  return BrandSchema.findByIdAndUpdate(id, { isDeleted: true });
};