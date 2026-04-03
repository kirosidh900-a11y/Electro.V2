import Offer from "../../models/offersSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Product from "../../models/productSchema.model.js";

import renderView from "../../utils/admin/renderView.util.js";
import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "../../utils/Redis/cache.js";

//  COMMON CACHE CLEAR (ADMIN + USER)
const clearOfferCache = async () => {
  // 🔹 ADMIN CACHE
  await deleteCacheByPattern("admin:offers:*");

  // 🔹 USER SIDE CACHE (VERY IMPORTANT)
  await deleteCacheByPattern("shop:*");
  await deleteCacheByPattern("home_products_*");
};

// 🔹 HELPER
const getTargetModel = (applies_to) => {
  const map = {
    product: "Product",
    category: "Category",
    brand: "Brand",
  };
  return map[applies_to] || null;
};

//  GET OFFERS (SSR + AJAX + CACHE)
export const getOffers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const type = req.query.type || "";
    const status = req.query.status || "";
    const isSearch = !!search;

    const now = new Date();

    // 🔥 BASE QUERY
    const query = {
      isDeleted: { $ne: true },
    };

    // 🔎 SEARCH
    if (search) {
      // query.name = { $regex: search, $options: "i" };
      query.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    // 🎯 TYPE FILTER
    if (type) {
      query.target_model = type;
    }

    // 📌 STATUS FILTER
    if (status === "active") {
      query.$and = [
        ...(query.$and || []),
        { start_date: { $lte: now } },
        { end_date: { $gte: now } },
      ];
    } else if (status === "expired") {
      query.end_date = { $lt: now };
    } else if (status === "upcoming") {
      query.start_date = { $gt: now };
    } else if (status === "inactive") {
      query.is_active = false;
    }

    console.log("Offer Query:", JSON.stringify(query));

    const cacheKey = `admin:offers:${req.xhr ? "xhr" : "view"}:page=${page}:search=${search}:type=${type}:status=${status}`;

    // CACHE
    let cached = null;

    if (!isSearch) {
      cached = await getCache(cacheKey);
    }

    if (cached) {
      const parsed = JSON.parse(cached);

      if (req.xhr) {
        return res.json(parsed); // only xhr cache
      }

      // DO NOT trust cached view blindly
      if (parsed.offers) {
        return res.render("admin/home/offers", parsed);
      }
    }

    //  DB
    const [offers, totalCount, categories, brands] = await Promise.all([
      Offer.find(query)
        .populate("target_ids")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Offer.countDocuments(query),

      Category.find().lean(),
      Brand.find().lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const baseData = {
      title: "Offers Management",
      activeMenu: "offers",
      offers,
      categories,
      brands,
      currentPage: page,
      totalPages,
      search,
      type,
      status,
    };

    // 🔥 AJAX
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/offerRows", {
        offers,
        currentPage: page,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage: page, totalPages },
      );

      const response = { rows, pagination };

      if (!isSearch) {
        await setCache(cacheKey, JSON.stringify(response), 600);
      }

      return res.json(response);
    }

    // 🔥 NORMAL
    if (!isSearch) {
      await setCache(cacheKey, JSON.stringify(baseData), 600);
    }

    return res.render("admin/home/offers", baseData);
  } catch (error) {
    console.error("Error fetching offers:", error);

    return res.render("admin/home/offers", {
      title: "Offers Management",
      activeMenu: "offers",
      offers: [],
      categories: [],
      brands: [],
      currentPage: 1,
      totalPages: 1,
    });
  }
};

// CREATE OFFER
export const createOffer = async (req, res) => {
  try {
    const {
      name,
      discount_type,
      discount,
      max_discount,
      applies_to,
      target_ids,
      start_date,
      end_date,
    } = req.body;

    const target_model =
      applies_to === "all" ? null : getTargetModel(applies_to);

    const newOffer = await Offer.create({
      name,
      discount_type,
      discount,
      max_discount,
      applies_to,
      target_model,
      target_ids: applies_to === "all" ? [] : target_ids,
      start_date,
      end_date,
    });

    // 🔥 CACHE CLEAR
    await clearOfferCache();

    return res.json({
      success: true,
      message: "Offer created successfully",
      data: newOffer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);

    return res.json({
      success: false,
      message: "Failed to create offer",
    });
  }
};

// GET TARGETS (FIXED)
export const getTargets = async (req, res) => {
  try {
    const { type } = req.query;

    let data = [];

    if (type === "product") {
      data = await Product.find().select("_id name").lean();
      data = data.map((i) => ({ _id: i._id, title: i.name }));
    } else if (type === "category") {
      data = await Category.find().select("_id title").lean();
      data = data.map((i) => ({ _id: i._id, title: i.title }));
    } else if (type === "brand") {
      data = await Brand.find().select("_id title").lean();
      data = data.map((i) => ({ _id: i._id, title: i.title }));
    } else {
      return res.json({ success: false, message: "Invalid type" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching targets:", error);

    return res.json({
      success: false,
      message: "Failed to load targets",
    });
  }
};

// GET OFFER BY ID
export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();

    return res.json({
      success: true,
      data: offer,
    });
  } catch {
    return res.json({
      success: false,
      message: "Offer not found",
    });
  }
};

// UPDATE OFFER
export const updateOffer = async (req, res) => {
  try {
    const {
      name,
      discount_type,
      discount,
      max_discount,
      applies_to,
      target_ids,
      start_date,
      end_date,
      is_active,
    } = req.body;

    const target_model =
      applies_to === "all" ? null : getTargetModel(applies_to);

    const existingOffer = await Offer.findById(req.params.id);

    const now = new Date();
    const originalStart = new Date(existingOffer.start_date);
    const newStart = new Date(req.body.start_date);

    // 🔥 Only validate if changed
    if (newStart.getTime() !== originalStart.getTime()) {
      // ❌ Offer already started
      if (originalStart < now) {
        throw new Error("Cannot change start date after offer has started");
      }

      // ❌ New date in past
      if (newStart < now) {
        throw new Error("Start date cannot be in the past");
      }
    }

    const updated = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        discount_type,
        discount,
        max_discount,
        applies_to,
        target_model,
        target_ids: applies_to === "all" ? [] : target_ids,
        start_date,
        end_date,
        is_active,
      },
      { new: true },
    );

    // 🔥 CACHE CLEAR
    await clearOfferCache();

    return res.json({
      success: true,
      message: "Offer updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(error);

    return res.json({
      success: false,
      message: "Update failed",
    });
  }
};

// DELETE OFFER
export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
    });

    // 🔥 CACHE CLEAR
    await clearOfferCache();

    return res.json({
      success: true,
      message: "Offer deleted",
    });
  } catch {
    return res.json({
      success: false,
      message: "Delete failed",
    });
  }
};

// TOGGLE STATUS
export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    offer.is_active = !offer.is_active;
    await offer.save();

    // 🔥 CACHE CLEAR
    await clearOfferCache();

    return res.json({
      success: true,
      data: offer,
    });
  } catch {
    return res.json({
      success: false,
      message: "Status update failed",
    });
  }
};
