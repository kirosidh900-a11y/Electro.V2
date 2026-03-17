import HTTP_STATUS from "../../constant/statusCode.js";
import Products from "../../models/productSchema.model.js";
import { findUserById } from "../../services/user/auth.service.js";

import AppError from "../../utils/partials/AppError.utils.js";

export const showHomePage = async (req, res) => {
  try {
    const products = await Products.find({
      status: "listed",
      isDeleted: false,
    })
      .populate("brand", "title")
      .populate("category", "title")
      .lean();

    const formattedProducts = products.map((product) => {
      const variant = product.variants?.find((v) => !v.isDeleted);

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand?.title,
        category: product.category?.title,
        price: variant?.price || 0,
        stock: variant?.stock || 0,
        image: variant?.product_image?.[0] || null,
      };
    });

    res.render("user/home/index", {
      products: formattedProducts,
    });
  } catch (error) {
    console.error("show home page Error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send("Failed to load homepage");
  }
};

export const profilePage = async (req, res, next) => {
  try {
    res.render("user/home/profile");
  } catch (error) {
    console.error("Profile Page Error:", error);
    next(error);
  }
};

export const editName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await findUserById(res.locals.user._id);

    if (!user) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }
    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!namePattern.test(name)) {
      throw new AppError("Name is invalid format!", HTTP_STATUS.BAD_REQUEST);
    }

    user.name = name;
    await user.save();

    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: "Your name is updated successfully!" });
  } catch (error) {
    console.error("Profile Page Error:", error);
    next(error);
  }
};
