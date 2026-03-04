import HTTP_STATUS from "../../constant/statusCode.js";
import User from "../../models/userSchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";
import Category from "../../models/CategorySchema.model.js";

//Dashboard
export const dashboard = (req, res) => {
  let adminData = null;

  if (req.admin) {
    adminData = req.admin;
  }

  res.render("admin/home/dashboard", {
    admin: adminData,
  });
};

//Customers
export const customers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isAdmin: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "Active") query.isBlock = false;
    if (status === "Blocked") query.isBlock = true;

    const totalCustomers = await User.countDocuments(query);

    const totalPages = Math.ceil(totalCustomers / limit);

    const customers = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const currentPage = page;

    // AJAX request
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/customerRows", {
        customers,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.json({ rows, pagination });
    }

    // normal page load
    res.render("admin/home/customers", {
      customers,
      currentPage,
      totalPages,
      title: "Customer Management",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const toggleBlockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlock = !user.isBlock;
    await user.save();

    res.json({
      success: true,
      isBlock: user.isBlock,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

//Category
export const category = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    // 🔎 Search
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // 📌 Status filter
    if (status === "listed") query.status = "listed";
    if (status === "unlisted") query.status = "unlisted";

    const totalCategories = await Category.countDocuments(query);

    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const currentPage = page;

    // AJAX request
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/categoryRows", {
        categories,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.json({ rows, pagination });
    }

    // Normal page load
    res.render("admin/home/category", {
      categories,
      currentPage,
      totalPages,
      title: "Category Management",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { title, status } = req.body;

    const category = await Category.create({
      title,
      status,
    });

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: false,
        message: "Category already exists",
      });
    }

    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const editCategory = async (req, res) => {
  try {
    const { title } = req.body;
    const id = req.params.id;

    const category = await Category.findByIdAndUpdate(id, { $set: { title } });

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: false,
        message: "Category already exists",
      });
    }

    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    await Category.findByIdAndUpdate(id, {
      isDeleted: true,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleCategoryStatus = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID not found!" });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: "Category not found!" });
    }

    // toggle status
    category.status = category.status === "listed" ? "unlisted" : "listed";

    await category.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      status: category.status,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
