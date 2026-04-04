import offersSchemaModel from "../../models/offersSchema.model.js";

export const getActiveOffers = async (product) => {
  const now = new Date();

  return offersSchemaModel.find({
    is_active: true,
    isDeleted: { $ne: true },
    start_date: { $lte: now },
    end_date: { $gte: now },
    $or: [
      { applies_to: "all" },
      { target_ids: product._id },
      { target_ids: product.category?._id },
      { target_ids: product.brand?._id },
    ],
  }).lean();
};
