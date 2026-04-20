import offersSchemaModel from "../../models/offersSchema.model.js";

export const getActiveOffers = async (product = null) => {
  const now = new Date();

  // 🔥 BASE FILTER (common)
  const baseFilter = {
    is_active: true,
    isDeleted: { $ne: true },
    start_date: { $lte: now },
    end_date: { $gte: now },
  };

  // ✅ CASE 1: NO PRODUCT → return all active offers
  if (!product) {
    return offersSchemaModel.find(baseFilter).lean();
  }

  // Extract IDs — handles both populated objects and raw ObjectIds
  const productId  = product._id;
  const categoryId = product.category?._id ?? product.category ?? null;
  const brandId    = product.brand?._id    ?? product.brand    ?? null;

  // ✅ CASE 2: PRODUCT PROVIDED → filter relevant offers
  return offersSchemaModel
    .find({
      ...baseFilter,
      $or: [
        { applies_to: "all" },
        { target_ids: productId },
        ...(categoryId ? [{ target_ids: categoryId }] : []),
        ...(brandId ? [{ target_ids: brandId }] : []),
      ],
    })
    .lean();
};
