import Products from "../../models/productSchema.model.js";
import { getCache, setCache } from "../../utils/Redis/cache.js";

export const getHomeProductsService = async (limit) => {
  const cacheKey = `home_products_${limit}`;

  try {
    // CHECK CACHE
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      console.log("⚡ Redis Cache Hit");

      return cachedData;
    }

    console.log("🐢 DB Hit");

    const products = await Products.aggregate([
      {
        $match: {
          status: "listed",
          isDeleted: false,
        },
      },

      { $unwind: "$variants" },

      {
        $match: {
          "variants.isDeleted": false,
          "variants.stock": { $gt: 0 },
        },
      },

      // LOOKUP Brand
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      { $unwind: "$brand" },

      {
        $match: {
          "brand.status": "listed",
          "brand.isDeleted": false,
        },
      },

      // LOOKUP CATEGORY
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $match: {
          "category.status": "listed",
          "category.isDeleted": false,
        },
      },

      // SORT
      { $sort: { createdAt: -1 } },

      // LIMIT (IMPORTANT 🔥)
      { $limit: limit },

      // FINAL SHAPE
      {
        $project: {
          _id: 1,
          name: 1,

          // BRAND
          brand: "$brand.title",
          brandLogo: "$brand.logo",

          // CATEGORY
          category: "$category.title",

          // VARIANT
          price: "$variants.price",
          stock: "$variants.stock",

          // IMAGE
          image: { $arrayElemAt: ["$variants.product_images.url", 0] },
        },
      },
    ]);

    // STORE IN REDIS (10 min)
    await setCache(cacheKey,products);

    return products;
  } catch (error) {
    console.error("Redis Error:", error);

    //  fallback → DB only
    return await Products.find({ status: "listed", isDeleted: false })
      .limit(limit)
      .lean();
  }
};
