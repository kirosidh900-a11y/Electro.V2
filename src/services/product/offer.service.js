import Offer from "../../models/offersSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Product from "../../models/productSchema.model.js";

import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "../../utils/Redis/cache.js";

// 🔹 CLEAR CACHE
export const clearOfferCache = async () => {
  await deleteCacheByPattern("admin:offers:*");
  await deleteCacheByPattern("shop:*");
  await deleteCacheByPattern("home_products_*");
};

// 🔹 HELPER
export const getTargetModel = (applies_to) => {
  const map = {
    product: "Product",
    category: "Category",
    brand: "Brand",
  };
  return map[applies_to] || null;
};

// 🔹 GET OFFERS
export const fetchOffersService = async ({ queryParams, isXHR }) => {
  const page = Number(queryParams.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const search = queryParams.search?.trim() || "";
  const type = queryParams.type || "";
  const status = queryParams.status || "";
  const isSearch = !!search;

  const now = new Date();

  const query = { isDeleted: { $ne: true } };

  if (search) {
    query.$or = [{ name: { $regex: search, $options: "i" } }];
  }

  if (type) query.target_model = type;

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

  const cacheKey = `admin:offers:${isXHR ? "xhr" : "view"}:page=${page}:search=${search}:type=${type}:status=${status}`;

  let cached = null;

  if (!isSearch) {
    cached = await getCache(cacheKey);
  }

  if (cached) {
    return { cached: JSON.parse(cached), cacheKey, isSearch };
  }

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

  return {
    data: {
      offers,
      categories,
      brands,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      search,
      type,
      status,
    },
    cacheKey,
    isSearch,
  };
};

// 🔹 CREATE
export const createOfferService = async (body) => {
  const target_model =
    body.applies_to === "all" ? null : getTargetModel(body.applies_to);

  const offer = await Offer.create({
    ...body,
    target_model,
    target_ids: body.applies_to === "all" ? [] : body.target_ids,
  });

  await clearOfferCache();
  return offer;
};

// 🔹 GET TARGETS
export const getTargetsService = async (type) => {
  if (type === "product") {
    const data = await Product.find().select("_id name").lean();
    return data.map((i) => ({ _id: i._id, title: i.name }));
  }

  if (type === "category") {
    const data = await Category.find().select("_id title").lean();
    return data.map((i) => ({ _id: i._id, title: i.title }));
  }

  if (type === "brand") {
    const data = await Brand.find().select("_id title").lean();
    return data.map((i) => ({ _id: i._id, title: i.title }));
  }

  throw new Error("Invalid type");
};

// 🔹 UPDATE
export const updateOfferService = async (id, body) => {
  const existingOffer = await Offer.findById(id);
  if (!existingOffer) throw new Error("Offer not found");

  const now = new Date();
  const originalStart = new Date(existingOffer.start_date);
  const newStart = new Date(body.start_date);

  if (newStart.getTime() !== originalStart.getTime()) {
    if (originalStart < now)
      throw new Error("Cannot change start date after started");

    if (newStart < now) throw new Error("Start date cannot be in past");
  }

  const target_model =
    body.applies_to === "all" ? null : getTargetModel(body.applies_to);

  const updated = await Offer.findByIdAndUpdate(
    id,
    {
      ...body,
      target_model,
      target_ids: body.applies_to === "all" ? [] : body.target_ids,
    },
    { new: true },
  );

  await clearOfferCache();
  return updated;
};

export const getOfferByIdService = async (id) => {
  const offer = await Offer.findById(id).lean();

  if (!offer) {
    throw new Error("Offer not found");
  }

  return offer;
};

// 🔹 DELETE
export const deleteOfferService = async (id) => {
  await Offer.findByIdAndUpdate(id, { isDeleted: true });
  await clearOfferCache();
};

// 🔹 TOGGLE
export const toggleOfferStatusService = async (id) => {
  const offer = await Offer.findById(id);
  if (!offer) throw new Error("Offer not found");

  offer.is_active = !offer.is_active;
  await offer.save();

  await clearOfferCache();
  return offer;
};
