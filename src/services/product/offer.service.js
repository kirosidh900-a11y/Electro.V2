import Offer from "../../models/offersSchema.model.js";
import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Product from "../../models/productSchema.model.js";

// 🔹 Helper
const getTargetModel = (applies_to) => {
  const map = {
    product: "Product",
    category: "Category",
    brand: "Brand",
  };
  return map[applies_to] || null;
};

// =====================================================
// ✅ GET OFFERS
// =====================================================
export const getOffersService = async () => {
  const [offers, categories, brands] = await Promise.all([
    Offer.find().populate("target_ids").lean(),
    Category.find().lean(),
    Brand.find().lean(),
  ]);

  return { offers, categories, brands };
};

// =====================================================
// ✅ CREATE OFFER
// =====================================================
export const createOfferService = async (data) => {
  const {
    name,
    discount_type,
    discount,
    max_discount,
    applies_to,
    target_ids,
    start_date,
    end_date,
  } = data;

  const target_model = applies_to === "all" ? null : getTargetModel(applies_to);

  return await Offer.create({
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
};

// =====================================================
// ✅ UPDATE OFFER
// =====================================================
export const updateOfferService = async (id, data) => {
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
  } = data;

  const target_model = applies_to === "all" ? null : getTargetModel(applies_to);

  return await Offer.findByIdAndUpdate(
    id,
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
};

// =====================================================
// ✅ DELETE OFFER
// =====================================================
export const deleteOfferService = async (id) => {
  return await Offer.findByIdAndDelete(id);
};

// =====================================================
// ✅ TOGGLE STATUS
// =====================================================
export const toggleOfferStatusService = async (id) => {
  const offer = await Offer.findById(id);
  offer.is_active = !offer.is_active;
  await offer.save();
  return offer;
};

// =====================================================
// ✅ GET SINGLE OFFER
// =====================================================
export const getOfferByIdService = async (id) => {
  return await Offer.findById(id).lean();
};

// =====================================================
// ✅ GET TARGETS
// =====================================================
export const getTargetsService = async (type) => {
  let data = [];

  if (type === "product") {
    data = await Product.find().select("_id name").lean();
    return data.map((i) => ({ _id: i._id, title: i.name }));
  }

  if (type === "category") {
    data = await Category.find().select("_id title").lean();
    return data.map((i) => ({ _id: i._id, title: i.title }));
  }

  if (type === "brand") {
    data = await Brand.find().select("_id title").lean();
    return data.map((i) => ({ _id: i._id, title: i.title }));
  }

  throw new Error("Invalid type");
};
