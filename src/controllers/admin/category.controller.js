import Category from "../../models/CategorySchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";
import HTTP_STATUS from "../../constant/statusCode.js";

//Category CRUD Start Hear
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

// Category Status Update
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

// Category Attribute
export const addCategoryAttribute = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const attribute = req.body;

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.json({
        success: false,
        message: "Category not found",
      });
    }

    // prevent duplicate key
    const key = attribute.key.trim().toLowerCase();
    const label = attribute.label.trim().toLowerCase();

    const exists = category.attributes.some(
      (attr) =>
        attr.key.toLowerCase() === key || attr.label.toLowerCase() === label,
    );

    if (exists) {
      return res.json({
        success: false,
        message: "Attribute key or label already exists",
      });
    }

    category.attributes.push(attribute);

    await category.save();

    res.json({
      success: true,
      message: "Attribute added successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
    console.log("Attribut adding Error:", error);
    next(error);
  }
};

export const deleteAttribute = async (req, res, next) => {
  try {
    const _id = req.params.id;
    const key = decodeURIComponent(req.params.key);

    const category = await Category.updateOne(
      { _id },
      { $pull: { attributes: { key } } },
    );

    // const exists = category.attributes.some(
    //   (attr) => attr.key.toLowerCase() === key,
    // );

    // if (!exists) {
    //   return res.json({
    //     success: false,
    //     message: "This category attribute is exists",
    //   });
    // }

    // category.attributes = category.attributes.filter((attr) => attr.key != key);
    // await category.save();
    if (category)
      res.json({
        success: true,
        message: "Attribute added successfully",
      });
    else
      return res.json({
        success: false,
        message: "Attribute is not Trichable",
      });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
    console.log("Attribut adding Error:", error);
    next(error);
  }
};
