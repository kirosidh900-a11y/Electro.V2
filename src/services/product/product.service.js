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
  const existingProduct = await Products.findOne({
    _id: { $ne: id },
    name: { $regex: `^${data.name}$`, $options: "i" },
  });

  if (existingProduct) {
    throw new AppError(
      "Product with this name already exists",
      HTTP_STATUS.CONFLICT,
    );
  }

  const product = await Products.findByIdAndUpdate(id, data, { new: true });

  return product;
};

// DELETE PRODUCT
export const deleteProductService = async (id) => {
  const product = await Products.findById(id);

  if (!product) throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);

  product.isDeleted = true;

  await product.save();
};

//  TOGGLE STATUS
export const toggleProductStatusService = async (id) => {
  const product = await Products.findById(id);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  const newStatus = product.status === "listed" ? "unlisted" : "listed";

  await Products.findByIdAndUpdate(
    id,
    { status: newStatus },
    { runValidators: false },
  );

  return newStatus;
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

//  GET PRODUCT DETAILS
export const getProductDetailsService = async (id) => {
  const product = await Products.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("category", "title")
    .populate("brand", "title");

  if (!product) throw new Error("Product not found");

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

//  ADD VARIANT
export const addVariantService = async ({
  productId,
  sku,
  price,
  stock,
  description,
  attributes,
  files,
}) => {
  const product = await Products.findById(productId);

  if (!product) {
    throw new AppError("Product not found", HTTP_STATUS.NOT_FOUND);
  }

  // ✅ Validate required fields
  if (!description || description.trim() === "") {
    throw new AppError("Description is required", HTTP_STATUS.BAD_REQUEST);
  }

  if (!sku || !price || !stock) {
    throw new AppError(
      "SKU, price and stock are required",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // ✅ Normalize SKU
  const normalizedSku = sku.trim().toLowerCase();

  const skuExists = await Products.exists({
    "variants.sku": { $regex: `^${normalizedSku}$`, $options: "i" },
  });

  if (skuExists) {
    throw new AppError("SKU already exists", HTTP_STATUS.CONFLICT);
  }

  // ✅ Fix attributes (FormData case)
  if (typeof attributes === "string") {
    attributes = JSON.parse(attributes);
  }

  // ================= IMAGE UPLOAD =================
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

  // ================= CREATE VARIANT =================
  const newVariant = {
    sku: normalizedSku,
    price,
    stock,
    description,
    attributes: new Map(Object.entries(attributes || {})),
    product_images: uploadedImages,
  };

  product.variants.push(newVariant);

  // ✅ Skip full validation (IMPORTANT FIX)
  await product.save({ validateBeforeSave: false });

  return {
    message: "Variant added successfully",
    variant: product.variants.at(-1),
  };
};

//  EDIT VARIANT
export const editVariantService = async (productId, variantId, data) => {
  const product = await Products.findById(productId);

  if (!product) throw new Error("Product not found");

  const variant = product.variants.id(variantId);

  if (!variant) throw new Error("Variant not found");

  const normalizedSku = data.sku.trim().toLowerCase();

  // 🔍 check globally across all products
  const skuExists = await Products.findOne({
    "variants.sku": { $regex: `^${normalizedSku}$`, $options: "i" },
    "variants._id": { $ne: variantId },
  });

  if (skuExists) {
    throw new Error("SKU already exists for another variant");
  }

  variant.sku = data.sku;
  variant.price = data.price;
  variant.stock = data.stock;

  variant.attributes = new Map(Object.entries(data.attributes || {}));

  await product.save();
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

  if (!variant) {
    throw new AppError("Variant not found", HTTP_STATUS.NOT_FOUND);
  }

  // delete images
  if (variant.product_images?.length) {
    await Promise.all(
      variant.product_images.map((img) =>
        img.imageId ? deleteFromCloudinary(img.imageId) : null,
      ),
    );
  }

  // remove variant
  variant.deleteOne();

  await product.save({ validateBeforeSave: false });

  return true;
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
