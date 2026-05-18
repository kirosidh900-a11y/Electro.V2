import Products from "../../models/productSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import mongoose from "mongoose";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../partials/cloudinary.service.js";
import { getCache, setCache } from "../../utils/Redis/cache.js";
import { findByIdOrThrow } from "../../utils/products/product.util.js";
import { applyPricingToProduct } from "../../utils/products/pricing.util.js";
import { getActiveOffers } from "../../utils/products/offers.util.js";

//  PRODUCTS PAGE
export const getProductsService = async ({ page, limit, search, status }) => {
  const query = { isDeleted: false };

  if (search) query.name = { $regex: search, $options: "i" };

  if (status === "listed") query.status = "listed";
  if (status === "unlisted") query.status = "unlisted";

  const [products, totalProducts, categories, brands] = await Promise.all([
    //Products
    Products.aggregate([
      {
        $match: { isDeleted: false },
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
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

      { $unwind: "$category" },
      { $unwind: "$brand" },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "category.title": { $regex: search, $options: "i" } },
                  { "brand.title": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      ...(status !== "All"
        ? [
            {
              $match: { status },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },

      {
        $project: {
          variants: 0,
          attributes: 0,
          "category.attributes": 0,
        },
      },

      { $skip: (page - 1) * limit },

      { $limit: limit },
    ]),

    // Products Count
    Products.aggregate([
      {
        $match: { isDeleted: false },
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
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

      { $unwind: "$category" },
      { $unwind: "$brand" },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "category.title": { $regex: search, $options: "i" } },
                  { "brand.title": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      ...(status !== "All"
        ? [
            {
              $match: { status },
            },
          ]
        : []),

      {
        $count: "total",
      },
    ]),

    //Categories
    Category.find({ isDeleted: false })
      .select(
        "-attributes -status -createdAt -updatedAt -__v  -isDeleted -status",
      )
      .lean(),

    //Brand
    Brand.find({ isDeleted: false })
      .select("-logo -status -createdAt -updatedAt -__v  -isDeleted")
      .lean(),
  ]);

  const totalProductsCount = totalProducts[0]?.total || 0;

  const totalPages = Math.ceil(totalProductsCount / limit);

  return { products, categories, brands, totalPages, currentPage: page };
};

//  CREATE PRODUCT
export const createProductService = async (data) => {
  const existingProduct = await Products.findOne({
    name: { $regex: `^${data.name}$`, $options: "i" },
  });

  if (existingProduct) {
    throw new Error("Product with this name already exists");
  }

  const product = await Products.create(data);

  return product;
};

//  UPDATE PRODUCT
export const updateProductService = async (id, data) => {
  // validate id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Product ID", HTTP_STATUS.BAD_REQUEST);
  }

  // normalize name
  if (data.name) {
    data.name = data.name.trim().toUpperCase();

    const existingProduct = await Products.findOne({
      name: data.name,
      _id: { $ne: id },
    });

    if (existingProduct) {
      throw new AppError(
        "Product with this name already exists",
        HTTP_STATUS.CONFLICT,
      );
    }
  }

  const product = await Products.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  return product;
};

// DELETE PRODUCT
export const deleteProductService = async (id) => {
  // validate id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Product ID", HTTP_STATUS.BAD_REQUEST);
  }

  const product = await Products.findById(id);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  product.isDeleted = true;

  await product.save();

  return {
    id: product._id,
    category: product.category,
    brand: product.brand,
  };
};

//  TOGGLE STATUS
export const toggleProductStatusService = async (id) => {
  const product = await Products.findById(id);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  // toggle manually
  product.status = product.status === "listed" ? "unlisted" : "listed";

  await product.save();

  return {
    category: product.category,
    brand: product.brand,
    status: product.status,
  };
};

//  GET ATTRIBUTES
export const getProductAttributesService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid product ID");
  }

  const product = await Products.findById(id);

  if (!product) throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);

  return product.attributes || [];
};

//GET PRODUCTS DATA
export const getProductByIdService = async (id) => {
  const product = await Products.findById(id)
    .populate("category", "_id title")
    .populate("brand", "_id title")
    .lean();

  if (!product) return null;

  return {
    _id: product._id,
    name: product.name,
    category: product.category?._id,
    brand: product.brand?._id,
    status: product.status,
    attributes: product.attributes || {},
  };
};

//GET VARIANT DATA
export const getVariantByIdService = async (productId, variantId) => {
  const product = await Products.findById(productId).select("variants");

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  // 🔥 normalize attributes (important if Map)
  const normalizedAttributes =
    variant.attributes instanceof Map
      ? Object.fromEntries(variant.attributes)
      : variant.attributes;

  return {
    ...variant.toObject(),
    attributes: normalizedAttributes,
  };
};

//  GET PRODUCT DETAILS Admin
export const getProductDetailsService = async (id, res) => {
  const product = await Products.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("category", "title")
    .populate("brand", "title");

  if (!product) {
    const tostError = "Product not found";
    setCookieMSG(res, tostError);
    res.redirect("/admin/products");
    return;
  }

  const variants = product.variants.filter((v) => !v.isDeleted);

  const totalVariants = variants.length;

  let minPrice = 0;
  let totalStock = 0;

  if (variants.length) {
    minPrice = Math.min(...variants.map((v) => v.price));
    totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }

  return { product, variants, totalVariants, minPrice, totalStock };
};

//Get Product Details Page User
export const getProductDetailsServiceUser = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product ID", HTTP_STATUS.BAD_REQUEST);
  }

  // ================= PRODUCT =================
  const product = await findByIdOrThrow(Products, productId, {
    match: { isDeleted: false, status: "listed" },
    populate: [
      { path: "category", select: "title", match: { status: "listed" } },
      { path: "brand", select: "title logo", match: { status: "listed" } },
      {
        path: "variants",
        match: { isDeleted: false },
        options: { sort: { createdAt: 1 } },
        populate: { path: "product_images", select: "url" },
      },
    ],
    lean: true,
  });

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  // ================= OFFERS =================
  const offers = await getActiveOffers(product);

  // ================= APPLY PRICING =================
  const productWithPricing = applyPricingToProduct(product, offers);

  // ================= SIMILAR =================
  const similarProducts = await Products.find({
    category: product.category?._id,
    _id: { $ne: product._id },
    status: "listed",
    isDeleted: false,
  })
    .select("name variants")
    .limit(8)
    .populate({
      path: "variants",
      match: { isDeleted: false },
      select: "_id price regular_price finalPrice product_images",
      populate: { path: "product_images", select: "url" },
    })
    .sort({ "variants.price": 1 })
    .lean();

  return {
    product: productWithPricing,
    similarProducts,
  };
};

//  ADD VARIANT
export const addVariantService = async ({
  productId,
  sku,
  price,
  stock,
  description,
  regular_price,
  max_discount_amount,
  gst_rate,
  attributes,
  files,
}) => {
  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  if (!description || description.trim() === "") {
    throw new AppError("Description is required", HTTP_STATUS.BAD_REQUEST);
  }

  if (!price) {
    throw new AppError("Price is required", HTTP_STATUS.BAD_REQUEST);
  }

  // regular_price (MRP) must be >= selling price
  if (regular_price !== undefined && regular_price !== null && Number(regular_price) < Number(price)) {
    throw new AppError("Regular price (MRP) must be greater than or equal to the selling price", HTTP_STATUS.BAD_REQUEST);
  }

  // max_discount_amount must be less than the selling price
  if (max_discount_amount !== undefined && max_discount_amount !== null && Number(max_discount_amount) > 0 && Number(max_discount_amount) >= Number(price)) {
    throw new AppError("Max discount amount must be less than the selling price", HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedSku = sku.trim().toLowerCase();

  const skuExists = await Products.exists({
    "variants.sku": { $regex: `^${normalizedSku}$`, $options: "i" },
  });

  if (skuExists) {
    throw new AppError("SKU already exists", HTTP_STATUS.CONFLICT);
  }

  if (typeof attributes === "string") {
    attributes = JSON.parse(attributes);
  }

  if (!files || files.length < 3) {
    throw new AppError("At least 3 images required", HTTP_STATUS.BAD_REQUEST);
  }

  const uploadedImages = [];

  for (const file of files) {
    const uploaded = await uploadToCloudinary(file.buffer, "products");

    uploadedImages.push({
      url: uploaded.secure_url,
      imageId: uploaded.public_id,
    });
  }

  const newVariant = {
    sku: normalizedSku,
    price,
    regular_price: regular_price ?? price,
    max_discount_amount: max_discount_amount ?? 0,
    gst_rate: gst_rate !== undefined ? Number(gst_rate) : 18,
    stock,
    description,
    attributes: new Map(Object.entries(attributes || {})),
    product_images: uploadedImages,
  };

  product.variants.push(newVariant);

  // 🔥 SAFETY FIX
  product.variants.forEach((v) => {
    if (!v.regular_price) v.regular_price = v.price;
    if (v.max_discount_amount == null) v.max_discount_amount = 0;
  });

  await product.save(); // ✅ SAFE

  return {
    message: "Variant added successfully",
    variant: product.variants.at(-1),
    product,
  };
};

//  EDIT VARIANT
export const editVariantService = async (productId, variantId, data) => {
  const product = await Products.findById(productId);
  if (!product) throw new Error("Product not found");

  const variant = product.variants.id(variantId);
  if (!variant) throw new Error("Variant not found");

  // ================= SKU CHECK =================
  if (data.sku) {
    const normalizedSku = data.sku.trim();

    const skuExists = await Products.exists({
      "variants.sku": new RegExp(`^${normalizedSku}$`, "i"),
      "variants._id": { $ne: variantId },
    });

    if (skuExists) {
      throw new Error("SKU already exists for another variant");
    }

    variant.sku = normalizedSku;
  }

  // ================= BASIC UPDATE =================

  if (data.price !== undefined) {
    variant.price = Number(data.price);
  }

  if (data.regular_price !== undefined) {
    variant.regular_price = Number(data.regular_price);
  }

  if (data.max_discount_amount !== undefined) {
    variant.max_discount_amount = Number(data.max_discount_amount);
  }

  if (data.gst_rate !== undefined) {
    variant.gst_rate = Number(data.gst_rate);
  }

  // ================= CROSS-FIELD VALIDATION =================
  // Use the final (post-update) values for validation
  const finalPrice = variant.price;
  const finalRegularPrice = variant.regular_price;
  const finalMaxDiscount = variant.max_discount_amount;

  if (finalRegularPrice !== undefined && finalRegularPrice < finalPrice) {
    throw new AppError(
      "Regular price (MRP) must be greater than or equal to the selling price",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (finalMaxDiscount > 0 && finalMaxDiscount >= finalPrice) {
    throw new AppError(
      "Max discount amount must be less than the selling price",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (data.stock !== undefined) {
    variant.stock = Number(data.stock);
  }

  if (data.description !== undefined) {
    variant.description = data.description;
  }

  if (data.attributes) {
    variant.attributes = new Map(Object.entries(data.attributes));
  }

  // ================= DELETE IMAGES =================
  let deleteImages = [];

  if (data.deleteImages) {
    try {
      deleteImages = JSON.parse(data.deleteImages);
    } catch {
      deleteImages = [];
    }
  }

  if (deleteImages.length > 0) {
    variant.product_images = variant.product_images.filter(
      (img) => !deleteImages.includes(img.imageId),
    );

    for (const imageId of deleteImages) {
      try {
        await deleteFromCloudinary(imageId);
      } catch (err) {
        console.error("Cloudinary delete failed:", err);
      }
    }
  }

  // ================= FILES =================
  const files = data.images || [];
  const replaceIds = [].concat(data.replaceImageIds || []);

  let fileIndex = 0;

  // 🔹 REPLACE IMAGES
  for (let i = 0; i < replaceIds.length; i++) {
    const imageId = replaceIds[i];
    const file = files[fileIndex];

    if (!file?.buffer) continue;

    const uploaded = await uploadToCloudinary(file.buffer, "variants");

    const imgIndex = variant.product_images.findIndex(
      (img) => img.imageId === imageId,
    );

    if (imgIndex !== -1) {
      try {
        await deleteFromCloudinary(imageId);
      } catch (err) {
        console.error("Cloudinary delete failed:", err);
      }

      variant.product_images[imgIndex] = {
        url: uploaded.secure_url,
        imageId: uploaded.public_id,
      };
    }

    fileIndex++;
  }

  // 🔹 ADD NEW IMAGES
  for (let i = fileIndex; i < files.length; i++) {
    const file = files[i];

    if (!file?.buffer) continue;

    const uploaded = await uploadToCloudinary(file.buffer, "variants");

    variant.product_images.push({
      url: uploaded.secure_url,
      imageId: uploaded.public_id,
    });
  }

  await product.save();

  // ================= SOCKET =================
  if (global.io) {
    global.io.emit("stockUpdated", {
      productId,
      variantId,
      stock: variant.stock,
      price: variant.price,
      regular_price: variant.regular_price,
      max_discount_amount: variant.max_discount_amount,
    });
  }

  return {
    product,
  };
};

//  DELETE VARIANT
export const deleteVariantService = async (variantId) => {
  const product = await Products.findOne({
    "variants._id": variantId,
  });

  if (!product) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  const variant = product.variants.id(variantId);

  if (!variant || variant.isDeleted) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  // SOFT DELETE
  variant.isDeleted = true;

  await product.save({ validateBeforeSave: false });

  return {
    product,
    message: "Variant deleted successfully",
  };
};

export const checkSkuAvailabilityService = async (sku) => {
  if (!sku) {
    return false;
  }

  const normalizedSku = sku.trim().toLowerCase();

  const exists = await Products.exists({
    "variants.sku": { $regex: `^${normalizedSku}$`, $options: "i" },
  });

  return !exists; // true = available
};

//Product services
export const getProductsListService = async ({
  page,
  limit,
  sort,
  search,
  category,
  brand,
  minPrice,
  maxPrice,
}) => {
  const skip = (page - 1) * limit;
  const isSearch = search && search.trim() !== "";

  const safeMin = Math.max(0, Math.min(Number(minPrice) || 0, 10_000_000));
  const safeMax = Math.max(safeMin, Math.min(Number(maxPrice) || 10_000_000, 10_000_000));

  const normalizedBrand = brand ? brand.split(",").sort().join(",") : "all";

  const cacheKey = `shop:category=${category || "all"}:brand=${normalizedBrand}:page=${page}:limit=${limit}:sort=${sort}:price=${safeMin}-${safeMax}`;

  // ================= CACHE =================
  if (!isSearch) {
    const cachedData = await getCache(cacheKey);
    if (cachedData?.products) {
      console.warn("⚡ Cache HIT:", cacheKey);
      return cachedData;
    }
  }

  console.warn("🐢 DB HIT:", cacheKey);

  // ================= FILTER =================
  const filter = {
    status: "listed",
    isDeleted: false,
  };

  if (isSearch) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { "variants.description": { $regex: search, $options: "i" } },
    ];
  }

  if (
    category &&
    category !== "all" &&
    mongoose.Types.ObjectId.isValid(category)
  ) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  if (brand && brand !== "all") {
    const brands = brand
      .split(",")
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    filter.brand = { $in: brands };
  }

  // ================= SORT =================
  let sortOption = {};

  switch ((sort || "").trim()) {
    case "priceLow":
      sortOption = { minPrice: 1, createdAt: -1 };
      break;
    case "priceHigh":
      sortOption = { minPrice: -1, createdAt: -1 };
      break;
    case "nameAsc":
      sortOption = { lowerName: 1 };
      break;
    case "nameDesc":
      sortOption = { lowerName: -1 };
      break;
    case "oldest":
      sortOption = { createdAt: 1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  // ================= AGGREGATION =================
  const result = await Products.aggregate([
    { $match: filter },

    { $unwind: "$variants" },

    {
      $match: {
        "variants.isDeleted": { $ne: true },
        "variants.price": {
          $gte: safeMin,
          $lte: safeMax,
        },
      },
    },

    { $sort: { "variants.price": 1 } },

    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        brand: { $first: "$brand" },
        category: { $first: "$category" },
        createdAt: { $first: "$createdAt" },
        variants: { $push: "$variants" },
        minPrice: { $first: "$variants.price" },
      },
    },

    {
      $addFields: {
        lowerName: { $toLower: "$name" },
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
    { $match: { "brand.status": "listed", "brand.isDeleted": false } },

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

    {
      $facet: {
        data: [
          { $sort: sortOption },
          { $skip: skip },
          { $limit: Number(limit) },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  // ================= FIX: CORRECT DATA =================
  const products = result[0]?.data || [];

  // ================= PRICING ENGINE =================
  // For each product, get only its applicable offers (product/category/brand/all)
  const productsWithPricing = await Promise.all(
    products.map(async (product) => {
      const productOffers = await getActiveOffers(product);
      return applyPricingToProduct(product, productOffers);
    })
  );

  // ================= RESPONSE =================
  const total = result[0]?.totalCount?.[0]?.count || 0;

  const responseData = {
    products: productsWithPricing,
    total,
    totalPages: Math.ceil(total / limit),
  };

  // ================= CACHE SAVE =================
  if (!isSearch) {
    await setCache(cacheKey, responseData);
  }

  return responseData;
};

export const getFilterDataService = async (filters = {}) => {
  const {
    category = "all",
    brand = "all",
    minPrice = 0,
    maxPrice = 100000,
  } = filters;

  /* ================= COMMON PRODUCT MATCH ================= */

  const buildProductMatch = (extraMatch = []) => {
    return {
      $expr: {
        $and: [
          { $eq: ["$status", "listed"] },
          { $eq: ["$isDeleted", false] },

          // 🔥 PRICE FILTER
          {
            $gte: [{ $min: "$variants.price" }, Number(minPrice) || 0],
          },
          {
            $lte: [{ $min: "$variants.price" }, Number(maxPrice) || 100000],
          },

          ...extraMatch,
        ],
      },
    };
  };

  /* ================= CATEGORY COUNTS ================= */

  const categoriesPipeline = [
    {
      $match: {
        status: "listed",
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "products",
        let: { categoryId: "$_id" },
        pipeline: [
          {
            $match: buildProductMatch([
              { $eq: ["$category", "$$categoryId"] },

              // 🔥 APPLY BRAND FILTER (if selected)
              ...(brand !== "all" && mongoose.Types.ObjectId.isValid(brand)
                ? [{ $eq: ["$brand", new mongoose.Types.ObjectId(brand)] }]
                : []),
            ]),
          },

          // 🔥 JOIN BRAND (ensure active)
          {
            $lookup: {
              from: "brands",
              localField: "brand",
              foreignField: "_id",
              as: "brand",
            },
          },
          { $unwind: "$brand" },
          { $match: { "brand.status": "listed" } },

          { $count: "count" }, // ✅ FAST COUNT
        ],
        as: "productData",
      },
    },
    {
      $addFields: {
        productCount: {
          $ifNull: [{ $arrayElemAt: ["$productData.count", 0] }, 0],
        },
      },
    },
    {
      $project: {
        title: 1,
        productCount: 1,
      },
    },
    { $sort: { title: 1 } },
  ];

  /* ================= BRAND COUNTS ================= */

  const brandsPipeline = [
    {
      $match: {
        status: "listed",
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "products",
        let: { brandId: "$_id" },
        pipeline: [
          {
            $match: buildProductMatch([
              { $eq: ["$brand", "$$brandId"] },

              // 🔥 APPLY CATEGORY FILTER (if selected)
              ...(category !== "all" &&
              mongoose.Types.ObjectId.isValid(category)
                ? [
                    {
                      $eq: ["$category", new mongoose.Types.ObjectId(category)],
                    },
                  ]
                : []),
            ]),
          },

          // 🔥 JOIN CATEGORY (ensure active)
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          { $match: { "category.status": "listed" } },

          { $count: "count" }, // ✅ FAST COUNT
        ],
        as: "productData",
      },
    },
    {
      $addFields: {
        productCount: {
          $ifNull: [{ $arrayElemAt: ["$productData.count", 0] }, 0],
        },
      },
    },
    {
      $project: {
        title: 1,
        logo: 1,
        productCount: 1,
      },
    },
    { $sort: { title: 1 } },
  ];

  /* ================= PARALLEL EXECUTION ================= */

  const [categories, brands] = await Promise.all([
    Category.aggregate(categoriesPipeline),
    Brand.aggregate(brandsPipeline),
  ]);

  return {
    categories,
    brands,
  };
};
