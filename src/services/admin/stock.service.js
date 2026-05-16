import Products from "../../models/productSchema.model.js";
import mongoose from "mongoose";

const LOW_STOCK_THRESHOLD = 10; // variants with stock <= this are "low stock"

export const getStockService = async ({ page = 1, limit = 15, search = "", stockFilter = "" }) => {
  const skip = (page - 1) * limit;

  // ── Build product-level match ─────────────────────────────────────────────
  const productMatch = { isDeleted: false };
  if (search.trim()) {
    productMatch.name = { $regex: search.trim(), $options: "i" };
  }

  // ── Aggregation: unwind variants so we can filter/sort per-variant ────────
  const pipeline = [
    { $match: productMatch },

    // Populate brand + category names
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brandDoc",
      },
    },
    { $unwind: { path: "$brandDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },

    // Unwind variants so each row = one variant
    { $unwind: "$variants" },

    // Exclude soft-deleted variants
    { $match: { "variants.isDeleted": { $ne: true } } },
  ];

  // ── Stock filter ──────────────────────────────────────────────────────────
  if (stockFilter === "out_of_stock") {
    pipeline.push({ $match: { "variants.stock": { $lte: 0 } } });
  } else if (stockFilter === "low_stock") {
    pipeline.push({ $match: { "variants.stock": { $gt: 0, $lte: LOW_STOCK_THRESHOLD } } });
  } else if (stockFilter === "in_stock") {
    pipeline.push({ $match: { "variants.stock": { $gt: LOW_STOCK_THRESHOLD } } });
  }

  // ── Sort: out-of-stock first, then low, then in-stock; within each group newest first ──
  pipeline.push({
    $addFields: {
      stockPriority: {
        $switch: {
          branches: [
            { case: { $lte: ["$variants.stock", 0] },                                    then: 0 },
            { case: { $lte: ["$variants.stock", LOW_STOCK_THRESHOLD] },                  then: 1 },
          ],
          default: 2,
        },
      },
    },
  });

  pipeline.push({ $sort: { stockPriority: 1, "variants.stock": 1, createdAt: -1 } });

  // ── Facet: paginated data + total count + summary stats ───────────────────
  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: Number(limit) },
        {
          $project: {
            _id: 1,
            name: 1,
            status: 1,
            brandName:    "$brandDoc.title",
            categoryName: "$categoryDoc.title",
            variant: {
              _id:           "$variants._id",
              sku:           "$variants.sku",
              stock:         "$variants.stock",
              reserved:      "$variants.reserved",
              price:         "$variants.price",
              attributes:    "$variants.attributes",
              product_images:"$variants.product_images",
            },
            stockPriority: 1,
          },
        },
      ],
      totalCount: [{ $count: "count" }],
      summary: [
        {
          $group: {
            _id: null,
            totalVariants:   { $sum: 1 },
            outOfStock:      { $sum: { $cond: [{ $lte: ["$variants.stock", 0] }, 1, 0] } },
            lowStock:        { $sum: { $cond: [{ $and: [{ $gt: ["$variants.stock", 0] }, { $lte: ["$variants.stock", LOW_STOCK_THRESHOLD] }] }, 1, 0] } },
            inStock:         { $sum: { $cond: [{ $gt: ["$variants.stock", LOW_STOCK_THRESHOLD] }, 1, 0] } },
            totalStockUnits: { $sum: "$variants.stock" },
          },
        },
      ],
    },
  });

  const [result] = await Products.aggregate(pipeline);

  const rows      = result?.data        || [];
  const total     = result?.totalCount?.[0]?.count || 0;
  const summary   = result?.summary?.[0] || {
    totalVariants: 0, outOfStock: 0, lowStock: 0, inStock: 0, totalStockUnits: 0,
  };

  return {
    rows,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    summary,
    LOW_STOCK_THRESHOLD,
  };
};
