import renderView from "../../utils/admin/renderView.util.js";
import { setCache } from "../../utils/Redis/cache.js";

import {
  fetchOffersService,
  createOfferService,
  getTargetsService,
  updateOfferService,
  getOfferByIdService,
  deleteOfferService,
  toggleOfferStatusService,
} from "../../services/product/offer.service.js";

// 🔹 GET OFFERS
export const getOffers = async (req, res) => {
  try {
    const { cached, data, cacheKey, isSearch } =
      await fetchOffersService({
        queryParams: req.query,
        isXHR: req.xhr,
      }); 

    if (cached) {
      return req.xhr
        ? res.json(cached)
        : res.render("admin/home/offers", cached);
    }

    if (req.xhr) {
      const rows = await renderView(
        res,
        "admin/home/partials/offerRows",
        data
      );

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        data
      );

      const response = { rows, pagination };

      if (!isSearch) {
        await setCache(cacheKey, JSON.stringify(response), 600);
      }

      return res.json(response);
    }

    const baseData = {
      title: "Offers Management",
      activeMenu: "offers",
      ...data,
    };

    if (!isSearch) {
      await setCache(cacheKey, JSON.stringify(baseData), 600);
    }

    return res.render("admin/home/offers", baseData);
  } catch (err) {
    console.error("Get Offers Error:", err);
    return res.render("admin/home/offers", { offers: [] });
  }
};

export const getOfferById = async (req, res) => {
  try {
    const offer = await getOfferByIdService(req.params.id);

    return res.json({
      success: true,
      data: offer,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message,
    });
  }
};

// 🔹 CREATE
export const createOffer = async (req, res) => {
  try {
    const offer = await createOfferService(req.body);

    res.json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// 🔹 TARGETS
export const getTargets = async (req, res) => {
  try {
    const data = await getTargetsService(req.query.type);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// 🔹 UPDATE
export const updateOffer = async (req, res) => {
  try {
    const updated = await updateOfferService(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      message: "Offer updated successfully",
      data: updated,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// 🔹 DELETE
export const deleteOffer = async (req, res) => {
  try {
    await deleteOfferService(req.params.id);

    res.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// 🔹 TOGGLE STATUS
export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await toggleOfferStatusService(
      req.params.id
    );

    res.json({
      success: true,
      data: offer,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};