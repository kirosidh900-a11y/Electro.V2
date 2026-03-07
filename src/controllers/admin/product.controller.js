import Products from "../../models/productSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";

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
