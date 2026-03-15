import Products from "../../models/productSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import mongoose from "mongoose";

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
    Category.find({ isDeleted: false }).lean(),

    //Brand
    Brand.find({ isDeleted: false }).lean(),
  ]);

  const totalProductsCount = totalProducts[0]?.total || 0;

  console.log(products);

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
    throw new Error("Product with this name already exists");
  }

  const product = await Products.findByIdAndUpdate(id, data, { new: true });

  return product;
};

// DELETE PRODUCT
export const deleteProductService = async (id) => {
  const product = await Products.findById(id);

  if (!product) throw new Error("Product not found");

  product.isDeleted = true;

  await product.save();
};

//  TOGGLE STATUS
export const toggleProductStatusService = async (id) => {
  const product = await Products.findById(id);

  if (!product) throw new Error("Product not found");

  product.status = product.status === "listed" ? "unlisted" : "listed";

  await product.save();

  return product.status;
};

//  GET ATTRIBUTES
export const getProductAttributesService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid product ID");
  }

  const product = await Products.findById(id);

  if (!product) throw new Error("Product not found");

  return product.attributes || [];
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
export const addVariantService = async (productId, data) => {
  const product = await Products.findById(productId);

  if (!product) throw new Error("Product not found");

  const normalizedSku = data.sku.trim().toLowerCase();

  // 🔥 check globally
  const skuExists = await Products.findOne({
    "variants.sku": { $regex: `^${normalizedSku}$`, $options: "i" },
  });

  if (skuExists) {
    throw new Error("SKU already exists for another variant");
  }

  product.variants.push({
    sku: data.sku,
    price: data.price,
    stock: data.stock,
    attributes: new Map(Object.entries(data.attributes || {})),
  });

  await product.save();
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
  const result = await Products.updateOne(
    { "variants._id": variantId },
    { $pull: { variants: { _id: variantId } } },
  );

  if (result.modifiedCount === 0) {
    throw new Error("Variant not found");
  }
};