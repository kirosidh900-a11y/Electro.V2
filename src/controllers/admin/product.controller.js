import Products from "../../models/productSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";
import mongoose from "mongoose";

export const productsPage = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

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

    // AJAX RESPONSE
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

      return res.json({ rows, pagination });
    }

    // NORMAL PAGE LOAD
    res.render("admin/home/products", {
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

export const createProduct = async (req, res) => {
  try {
    let { name, category, brand, status, attributes } = req.body;

    name = name?.trim();

    if (!name) {
      return res.json({
        success: false,
        message: "Product name is required",
      });
    }

    const productNamePattern = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

    if (!productNamePattern.test(name)) {
      return res.json({
        success: false,
        message: "Invalid product name",
      });
    }

    if (!category) {
      return res.json({
        success: false,
        message: "Category is required",
      });
    }

    if (!brand) {
      return res.json({
        success: false,
        message: "Brand is required",
      });
    }

    // Validate status
    const validStatus = ["listed", "unlisted"];

    if (status && !validStatus.includes(status)) {
      return res.json({
        success: false,
        message: "Invalid product status",
      });
    }

    // Check duplicate product
    const existingProduct = await Products.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingProduct) {
      return res.json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    // Create product
    const product = await Products.create({
      name,
      category,
      brand,
      status,
      attributes: attributes || [],
    });

    return res.json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.log("Create product error:", error);

    res.json({
      success: false,
      message: "Something went wrong while creating the product",
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, category, brand, status, attributes } = req.body;

    name = name?.trim();

    if (!name) {
      return res.json({
        success: false,
        message: "Product name is required",
      });
    }

    const productNamePattern = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

    if (!productNamePattern.test(name)) {
      return res.json({
        success: false,
        message: "Invalid product name",
      });
    }

    if (!category) {
      return res.json({
        success: false,
        message: "Category is required",
      });
    }

    if (!brand) {
      return res.json({
        success: false,
        message: "Brand is required",
      });
    }

    // Validate status
    const validStatus = ["listed", "unlisted"];

    if (status && !validStatus.includes(status)) {
      return res.json({
        success: false,
        message: "Invalid product status",
      });
    }

    // Check duplicate product (exclude current product)
    const existingProduct = await Products.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingProduct) {
      return res.json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    // Update product
    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      {
        name,
        category,
        brand,
        status,
        attributes: attributes || [],
      },
      { new: true },
    );

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log("Update product error:", error);

    res.json({
      success: false,
      message: "Something went wrong while updating the product",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Products.findById(id);

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found",
      });
    }

    // soft delete
    product.isDeleted = true;

    await product.save();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Failed to delete brand",
    });
  }
};

export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Products.findById(id);

    if (!product) {
      return res.json({
        success: false,
        message: "product not found",
      });
    }

    // toggle status
    product.status = product.status === "listed" ? "unlisted" : "listed";

    await product.save();

    res.json({
      success: true,
      status: product.status,
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Failed to update brand status",
    });
  }
};

export const getAttributes = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Products.findById(id);

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found",
      });
    }

    const productAttributes = product.attributes || {};

    res.json({
      success: true,
      productAttributes,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

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

    // variants from embedded array
    const variants = product.variants.filter((v) => !v.isDeleted);

    // metrics
    const totalVariants = variants.length;

    let minPrice = 0;
    let totalStock = 0;

    if (variants.length > 0) {
      minPrice = Math.min(...variants.map((v) => v.price));

      totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    console.log(variants);

    res.render("admin/home/productDetails", {
      title: "Product Details",
      product,
      variants,
      totalVariants,
      minPrice,
      totalStock,
    });
  } catch (error) {
    console.log("Product details error:", error);

    next(error);
  }
};

// Veriants Start Hear
export const addVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, price, stock, attributes } = req.body;

    const product = await Products.findById(id);

    if (!product) {
      return res.json({
        success: false,
        message: "Product not found",
      });
    }

    const skuExists = product.variants.some((v) => v.sku === sku);

    if (skuExists) {
      return res.json({
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

    res.json({
      success: true,
      message: "Variant added successfully",
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: "Failed to add variant",
    });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;

    await Products.updateOne(
      { "variants._id": variantId },
      { $pull: { variants: { _id: variantId } } },
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Delete Variant Error:",err)
    res.json({ success: false });
  }
};

export const addVariantImage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const product = await Products.findById(productId);

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.json({ success: false, message: "Variant not found" });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    if (!variant.product_image) {
      variant.product_image = [];
    }

    variant.product_image.push(imagePath);

    await product.save();

    res.json({
      success: true,
      message: "Image uploaded successfully",
    });
  } catch (err) {
    console.log("Variant img uploading Eroor:",err)
    res.json({
      success: false,
      message: "Upload failed",
    });
  }
};
