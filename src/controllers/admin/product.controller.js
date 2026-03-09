import Products from "../../models/productSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import HTTP_STATUS from "../../constant/statusCode.js";

// PRODUCTS PAGE

export const productsPage = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    if (search) query.name = { $regex: search, $options: "i" };

    if (status === "listed") query.status = "listed";
    if (status === "unlisted") query.status = "unlisted";

    const totalProducts = await Products.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Products.find(query)
      .populate("category", "title")
      .populate("brand", "title")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const categories = await Category.find({ isDeleted: false });
    const brands = await Brand.find({ isDeleted: false });

    const currentPage = page;

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      const rows = await renderView(res, "admin/home/partials/productRows", {
        products,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.status(HTTP_STATUS.OK).json({ rows, pagination });
    }

    res.status(HTTP_STATUS.OK).render("admin/home/products", {
      products,
      categories,
      brands,
      currentPage,
      totalPages,
      title: "Products Management",
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    let { name, category, brand, status, attributes } = req.body;
    name = name?.trim();

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Product name is required",
      });
    }

    const productNamePattern = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

    if (!productNamePattern.test(name)) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: "Invalid product name",
      });
    }

    if (!category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!brand) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Brand is required",
      });
    }

    const validStatus = ["listed", "unlisted"];

    if (status && !validStatus.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const existingProduct = await Products.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingProduct) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    const product = await Products.create({
      name,
      category,
      brand,
      status,
      attributes: attributes || [],
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong while creating the product",
    });
  }
};

//UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, category, brand, status, attributes } = req.body;

    name = name?.trim();

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Product name is required",
      });
    }

    const productNamePattern = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

    if (!productNamePattern.test(name)) {
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: "Invalid product name",
      });
    }

    if (!category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!brand) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Brand is required",
      });
    }

    const validStatus = ["listed", "unlisted"];

    if (status && !validStatus.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const existingProduct = await Products.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingProduct) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { name, category, brand, status, attributes: attributes || [] },
      { new: true },
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong while updating the product",
    });
  }
};

// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Products.findById(id);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isDeleted = true;

    await product.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

//TOGGLE STATUS
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Products.findById(id);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    product.status = product.status === "listed" ? "unlisted" : "listed";

    await product.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      status: product.status,
    });
  } catch (error) {
    console.error(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update product status",
    });
  }
};

//Get Attributes
export const getAttributes = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Products.findById(id);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    const productAttributes = product.attributes || [];

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      productAttributes,
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch product attributes",
    });
  }
};

//GET PRODUCT DETAILS
export const getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.redirect("/admin/products");
    }

    const product = await Products.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("category", "title")
      .populate("brand", "title");

    if (!product) {
      return res.redirect("/admin/products");
    }

    const variants = product.variants.filter((v) => !v.isDeleted);

    const totalVariants = variants.length;

    let minPrice = 0;
    let totalStock = 0;

    if (variants.length > 0) {
      minPrice = Math.min(...variants.map((v) => v.price));
      totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    res.status(HTTP_STATUS.OK).render("admin/home/productDetails", {
      title: "Product Details",
      product,
      variants,
      totalVariants,
      minPrice,
      totalStock,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// CUD of Product Variant Side
export const addVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, price, stock, attributes } = req.body;

    const product = await Products.findById(id);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    const normalizedSku = sku.trim().toLowerCase();

    const skuExists = product.variants.some(
      (v) => v.sku.trim().toLowerCase() === normalizedSku,
    );

    if (skuExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "SKU already exists",
      });
    }

    product.variants.push({
      sku,
      price,
      stock,
      attributes: new Map(Object.entries(attributes || {})),
    });

    await product.save();

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Variant added successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to add variant",
    });
  }
};

export const editVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { sku, price, stock, attributes } = req.body;

    const product = await Products.findById(productId);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    const normalizedSku = sku.trim().toLowerCase();

    const skuExists = product.variants.some(
      (v) =>
        v.sku?.trim().toLowerCase() === normalizedSku &&
        v._id.toString() !== variantId,
    );

    if (skuExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "SKU already exists",
      });
    }

    variant.sku = sku;
    variant.price = price;
    variant.stock = stock;
    variant.attributes = new Map(Object.entries(attributes || {}));

    await product.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Variant updated successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update variant",
    });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;

    const result = await Products.updateOne(
      { "variants._id": variantId },
      { $pull: { variants: { _id: variantId } } },
    );

    if (result.modifiedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (err) {
    console.log("Delete Variant Error:", err);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to delete variant",
    });
  }
};

// IMG Controler
export const addVariantImage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const product = await Products.findById(productId);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    const imagePath = `/uploads/products/${req.file.filename}`;

    if (!variant.product_image) {
      variant.product_image = [];
    }

    variant.product_image.push(imagePath);

    product.markModified("variants");

    await product.save();

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Upload failed",
    });
  }
};

export const deleteVariantImage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { imagePath } = req.body;

    const product = await Products.findById(productId);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    variant.product_image = variant.product_image.filter(
      (img) => img !== imagePath,
    );

    const filePath = path.join("public", imagePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await product.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Delete failed",
    });
  }
};
