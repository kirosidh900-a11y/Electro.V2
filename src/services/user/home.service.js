import Products from "../../models/productSchema.model.js";
import { getCache, setCache } from "../../utils/Redis/cache.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";
import { calculateBestPrice } from "../../utils/products/pricing.util.js";

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
      
      // PICK VARIANT WITH LOWEST PRICE (works on all MongoDB versions)
      {
        $addFields: {
          variant: {
            $reduce: {
              input: "$validVariants",
              initialValue: { $arrayElemAt: ["$validVariants", 0] },
              in: {
                $cond: [
                  { $lt: ["$$this.price", "$$value.price"] },
                  "$$this",
                  "$$value",
                ],
              },
            },
          },
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
          categoryId: "$category._id",
          brandId: "$brand._id",
          price: "$variant.price",
          regular_price: "$variant.regular_price",
          max_discount_amount: "$variant.max_discount_amount",
          stock: "$variant.stock",
          variantId: "$variant._id",
          image: { $arrayElemAt: ["$variant.product_images.url", 0] },
        },
      },
    ]);

    // Apply offer pricing per product
    const productsWithPricing = await Promise.all(
      products.map(async (p) => {
        // Build a minimal product shape for getActiveOffers
        const productShape = {
          _id: p._id,
          category: { _id: p.categoryId },
          brand: { _id: p.brandId },
        };
        const offers = await getActiveOffers(productShape);

        // Build a minimal variant shape for calculateBestPrice
        const variantShape = {
          price: p.price,
          regular_price: p.regular_price ?? p.price,
          max_discount_amount: p.max_discount_amount ?? 0,
        };
        const pricing = calculateBestPrice(variantShape, offers);

        return {
          ...p,
          finalPrice: pricing.finalPrice,
          savings: pricing.savings,
          offerSavings: pricing.offerSavings,
          gstAmount: pricing.gstAmount,
          appliedOffer: pricing.appliedOffer,
        };
      })
    );

    await setCache(cacheKey, productsWithPricing);
    console.warn("✅ Cache Set", productsWithPricing.length);

    return productsWithPricing;
  } catch (error) {
    console.error("Redis Error:", error);

    return await Products.find({ status: "listed", isDeleted: false })
      .limit(limit)
      .lean();
  }
};
