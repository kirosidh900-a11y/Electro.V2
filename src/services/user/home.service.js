import Products from "../../models/productSchema.model.js";
import { getCache, setCache } from "../../utils/Redis/cache.js";

export const getHomeProductsService = async (limit) => {
  const cacheKey = `home_products_${limit}`;

  try {
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

      { $sort: { createdAt: -1 } },
      { $limit: limit },

      {
        $project: {
          _id: 1,
          name: 1,
          brand: "$brand.title",
          brandLogo: "$brand.logo",
          category: "$category.title",
          price: "$variants.price",
          stock: "$variants.stock",
          variantId: "$variants._id", // ✅ FIX
          image: { $arrayElemAt: ["$variants.product_images.url", 0] },
        },
      },
    ]);

    await setCache(cacheKey, products);

    return products;
  } catch (error) {
    console.error("Redis Error:", error);

    return await Products.find({ status: "listed", isDeleted: false })
      .limit(limit)
      .lean();
  }
};
