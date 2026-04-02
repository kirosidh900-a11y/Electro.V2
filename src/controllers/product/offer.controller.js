import Category from "../../models/CategorySchema.model.js";
import Brand from "../../models/brandSchema.model.js";
import Offer from "../../models/offersSchema.model.js";
import Product from "../../models/productSchema.model.js";

const getTargetModel = (applies_to) => {
  const map = {
    product: "Product",
    category: "Category",
    brand: "Brand",
  };

  return map[applies_to] || null;
};

export const getOffers = async (req, res) => {
  try {
    const [offers, categories, brands] = await Promise.all([
      Offer.find()
        .populate("target_ids") // 👈 this works only if model names match
        .lean(),
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
    console.error("Error fetching offers:", error);
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
};

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
      applies_to === "all" ? null : getTargetModel(applies_to); // Helper function to map applies_to to model name

    const newOffer = new Offer({
      name,
      discount_type,
      discount,
      max_discount,
      target_model,
      applies_to,
      target_ids: applies_to === "all" ? [] : target_ids,
      start_date,
      end_date,
    });

    await newOffer.save();

    return res.json({
      success: true,
      message: "Offer created successfully",
      offer: newOffer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);

    return res.json({
      success: false,
      message: "Failed to create offer",
    });
  }
};

export const getTargets = async (req, res) => {
  try {
    const { type } = req.query;

    console.log("Fetching targets for type:", type);
    let data = [];

    if (type === "product") {
      data = await Product.find().select("name").lean();
    } else if (type === "category") {
      data = await Category.find().select("title").lean();
    } else if (type === "brand") {
      data = await Brand.find().select("title").lean();
    } else {
      return res.json({
        success: false,
        message: "Invalid type",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching targets:", error);
    return res.json({
      success: false,
      message: "Failed to load targets",
    });
  }
};

export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).lean();

    return res.json({
      success: true,
      data: offer,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Offer not found",
    });
  }
};

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
      applies_to === "all"
        ? null
        : applies_to === "product"
          ? "Product"
          : applies_to === "category"
            ? "Category"
            : "Brand";

    const updated = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        discount_type,
        discount,
        max_discount,
        applies_to,
        target_ids: applies_to === "all" ? [] : target_ids,
        target_model,
        start_date,
        end_date,
        is_active,
      },
      { new: true },
    );

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

export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);

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

export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    offer.is_active = !offer.is_active;
    await offer.save();

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