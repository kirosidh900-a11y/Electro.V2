import { Router } from "express";
const router = Router();

import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Offer from "../../models/offersSchema.model.js";
import Product from "../../models/productSchema.model.js";

router.get("/", async (req, res) => {
  try {
    const [offers, categories, brands] = await Promise.all([
      Offer.find().lean(),
      Category.find().lean(),
      Brand.find().lean(),
    ]);

    res.render("admin/home/offers", {
      title: "Offers Management",
      activeMenu: "offers",
      offers,
      categories,
      brands,
      currentPage: 1,
      totalPages: 1,
    });
  } catch (error) {
    res.render("admin/home/offers", {
      title: "Offers Management",
      activeMenu: "offers",
      offers: [],
      categories: [], 
      brands: [],
      currentPage: 1,
      totalPages: 1,
      error: "Failed to load data",
    });
  }
});

router.get("/targets", async (req, res) => {
  try {

    const { type } = req.query;

    let data = [];

    if (type === "product") {
      data = await Product.find().select("name").lean();
    }

    else if (type === "category") {
      data = await Category.find().select("title").lean();
    }

    else if (type === "brand") {
      data = await Brand.find().select("title").lean();
    }

    else {
      return res.json({
        success: false,
        message: "Invalid type"
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Failed to load targets"
    });
  }
});

export default router;
