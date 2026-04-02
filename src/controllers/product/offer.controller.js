import Offer from "../../models/offersSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Product from "../../models/productSchema.model.js";

import renderView from "../../utils/admin/renderView.util.js";
import { getCache, setCache, deleteCacheByPattern } from "../../utils/Redis/cache.js";


// =====================================================
// 🔥 COMMON CACHE CLEAR (ADMIN + USER)
// =====================================================
const clearOfferCache = async () => {
  // 🔹 ADMIN CACHE
  await deleteCacheByPattern("admin:offers:*");

  // 🔹 USER SIDE CACHE (VERY IMPORTANT)
  await deleteCacheByPattern("shop:*");
  await deleteCacheByPattern("home_products_*");
};


// =====================================================
// 🔹 HELPER
// =====================================================
const getTargetModel = (applies_to) => {
  const map = {
    product: "Product",
    category: "Category",
    brand: "Brand",
  };
  return map[applies_to] || null;
};


// =====================================================
// ✅ GET OFFERS (SSR + AJAX + CACHE)
// =====================================================
export const getOffers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const cacheKey = `admin:offers:page=${page}`;

    // 🔥 CACHE
    const cached = await getCache(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);

      if (req.xhr) return res.json(parsed);

      return res.render("admin/home/offers", parsed);
    }

    // 🔥 DB
    const [offers, categories, brands] = await Promise.all([
      Offer.find().populate("target_ids").lean(),
      Category.find().lean(),
      Brand.find().lean(),
    ]);

    const baseData = {
      title: "Offers Management",
      activeMenu: "offers",
      offers,
      categories,
      brands,
      currentPage: page,
      totalPages: 1,
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
        { currentPage: page, totalPages: 1 }
      );

      const response = { rows, pagination };

      await setCache(cacheKey, JSON.stringify(response), 60);

      return res.json(response);
    }

    // 🔥 NORMAL
    await setCache(cacheKey, JSON.stringify(baseData), 60);

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


// =====================================================
// ✅ CREATE OFFER
// =====================================================
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


// =====================================================
// ✅ GET TARGETS (FIXED)
// =====================================================
export const getTargets = async (req, res) => {
  try {
    const { type } = req.query;

    let data = [];

    if (type === "product") {
      data = await Product.find().select("_id name").lean();
      data = data.map(i => ({ _id: i._id, title: i.name }));
    } else if (type === "category") {
      data = await Category.find().select("_id title").lean();
      data = data.map(i => ({ _id: i._id, title: i.title }));
    } else if (type === "brand") {
      data = await Brand.find().select("_id title").lean();
      data = data.map(i => ({ _id: i._id, title: i.title }));
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


// =====================================================
// ✅ GET OFFER BY ID
// =====================================================
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


// =====================================================
// ✅ UPDATE OFFER
// =====================================================
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
      { new: true }
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


// =====================================================
// ✅ DELETE OFFER
// =====================================================
export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);

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


// =====================================================
// ✅ TOGGLE STATUS
// =====================================================
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