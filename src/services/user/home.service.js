import Products from "../../models/productSchema.model.js";
import { getCache, setCache } from "../../utils/Redis/cache.js";

export const getHomeProductsService = async (limit) => {
  const cacheKey = `home_products_${limit}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.warn("⚡ Redis Cache Hit");
      return cachedData;
    }

    console.warn("🐢 DB Hit");

    const products = await Products.aggregate([
      {
        $match: {
          status: "listed",
          isDeleted: false,
        },
      },

      // FILTER VALID VARIANTS (WITHOUT UNWIND)
      {
        $addFields: {
          validVariants: {
            $filter: {
              input: "$variants",
              as: "variant",
              cond: {
                $and: [
                  { $eq: ["$$variant.isDeleted", false] },
                  { $gt: ["$$variant.stock", 0] },
                ],
              },
            },
          },
        },
      },

      // REMOVE PRODUCTS WITH NO VALID VARIANTS
      {
        $match: {
          "validVariants.0": { $exists: true },
        },
      },

      // BRAND
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      { $match: { "brand.status": "listed", "brand.isDeleted": false } },

      // CATEGORY
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $match: { "category.status": "listed", "category.isDeleted": false } },

      { $sort: { createdAt: -1 } },
      
      // PICK FIRST VALID VARIANT
      {
        $addFields: {
          variant: { $arrayElemAt: ["$validVariants", 0] },
        },
      },
      
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          brand: "$brand.title",
          brandLogo: "$brand.logo",
          category: "$category.title",
          price: "$variant.price",
          stock: "$variant.stock",
          variantId: "$variant._id",
          image: { $arrayElemAt: ["$variant.product_images.url", 0] },
        },
      },
    ]);

    await setCache(cacheKey, products);
    console.warn("✅ Cache Set", products.length);

    return products;
  } catch (error) {
    console.error("Redis Error:", error);

    return await Products.find({ status: "listed", isDeleted: false })
      .limit(limit)
      .lean();
  }
};
