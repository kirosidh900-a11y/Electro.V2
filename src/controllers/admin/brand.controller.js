import renderView from "../../utils/admin/renderView.util.js";
import BrandSchema from "../../models/brandSchema.model.js";
import fs from "fs";


export const brandPage = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = { isDeleted: false };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // 📌 Status filter
    if (status === "listed") query.status = "listed";
    if (status === "unlisted") query.status = "unlisted";

    const totalBrands = await BrandSchema.countDocuments(query);

    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await BrandSchema.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const currentPage = page;

    // AJAX request
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/brandRows", {
        brands,
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
    res.render("admin/home/brand", {
      brands,
      currentPage,
      totalPages,
      title: "Brand Management",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createBrand = async (req, res) => {
  try {
    const { title, status } = req.body;

    // check title
    if (!title || !title.trim()) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      return res.json({
        success: false,
        message: "Brand title required",
      });
    }

    const titlePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!titlePattern.test(title)) {
      return res.json({
        success: false,
        message: "Brand name must contain only letters and single spaces",
      });
    }
    // check logo
    if (!req.file) {
      return res.json({
        success: false,
        message: "Logo required",
      });
    }

    const logo = `/uploads/brands/${req.file.filename}`;

    await BrandSchema.create({
      title,
      status,
      logo,
    });

    return res.json({
      success: true,
      message: "Brand created successfully",
    });
  } catch (error) {
    // Mongo duplicate key
    if (error.code === 11000) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      return res.json({
        success: false,
        message: "Brand already exists",
      });
    }

    console.error(error);

    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.json({
      success: false,
      message: "Failed to create brand",
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const brand = await BrandSchema.findById(id);

    if (!brand) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.json({
        success: false,
        message: "Brand not found",
      });
    }

    // update title
    if (title) {
      brand.title = title.trim().toUpperCase();
    }

    // update status
    if (status) {
      brand.status = status;
    }

    // update logo
    if (req.file) {
      // delete old logo
      if (brand.logo) {
        const oldPath = `public${brand.logo}`;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      brand.logo = `/uploads/brands/${req.file.filename}`;
    }

    await brand.save();

    res.json({
      success: true,
      message: "Brand updated successfully",
    });
  } catch (error) {
    console.error(error);

    if (req.file) fs.unlink(req.file.path, () => {});

    res.json({
      success: false,
      message: "Failed to update brand",
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await BrandSchema.findById(id);

    if (!brand) {
      return res.json({
        success: false,
        message: "Brand not found",
      });
    }

    // delete logo from disk
    if (brand.logo) {
      const path = `public${brand.logo}`;

      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    }

    // soft delete
    brand.isDeleted = true;

    await brand.save();

    res.json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Failed to delete brand",
    });
  }
};

export const toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await BrandSchema.findById(id);

    if (!brand) {
      return res.json({
        success: false,
        message: "Brand not found",
      });
    }

    // toggle status
    brand.status = brand.status === "listed" ? "unlisted" : "listed";

    await brand.save();

    res.json({
      success: true,
      status: brand.status,
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Failed to update brand status",
    });
  }
};
