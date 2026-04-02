import renderView from "../../utils/admin/renderView.util.js";
import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "../../utils/Redis/cache.js";

import {
  getOffersService,
  createOfferService,
  updateOfferService,
  deleteOfferService,
  toggleOfferStatusService,
  getOfferByIdService,
  getTargetsService,
} from "../../services/product/offer.service.js";

// =====================================================
// ✅ GET OFFERS (SSR + AJAX + CACHE)
// =====================================================
export const getOffers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const cacheKey = `admin:offers:page=${page}`;

    const cached = await getCache(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      if (req.xhr) return res.json(parsed);
      return res.render("admin/home/offers", parsed);
    }

    const { offers, categories, brands } = await getOffersService();

    const baseData = {
      title: "Offers Management",
      activeMenu: "offers",
      offers,
      categories,
      brands,
      currentPage: page,
      totalPages: 1,
    };

    // AJAX
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/offerRows", {
        offers,
        currentPage: page,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        {
          currentPage: page,
          totalPages: 1,
        },
      );

      const response = { rows, pagination };

      await setCache(cacheKey, JSON.stringify(response), 60);

      return res.json(response);
    }

    await setCache(cacheKey, JSON.stringify(baseData), 60);

    return res.render("admin/home/offers", baseData);
  } catch (error) {
    console.error(error);

    return res.render("admin/home/offers", {
      title: "Offers Management",
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
    const offer = await createOfferService(req.body);

    await deleteCacheByPattern("admin:offers:*");

    return res.json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error) {
    console.error(error);

    return res.json({
      success: false,
      message: "Failed to create offer",
    });
  }
};

// =====================================================
// ✅ UPDATE OFFER
// =====================================================
export const updateOffer = async (req, res) => {
  try {
    const updated = await updateOfferService(req.params.id, req.body);

    await deleteCacheByPattern("admin:offers:*");

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
    await deleteOfferService(req.params.id);

    await deleteCacheByPattern("admin:offers:*");

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
    const offer = await toggleOfferStatusService(req.params.id);

    await deleteCacheByPattern("admin:offers:*");

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

// =====================================================
// ✅ GET OFFER BY ID
// =====================================================
export const getOfferById = async (req, res) => {
  try {
    const offer = await getOfferByIdService(req.params.id);

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
// ✅ GET TARGETS
// =====================================================
export const getTargets = async (req, res) => {
  try {
    const data = await getTargetsService(req.query.type);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};
