import HTTP_STATUS from "../../constant/statusCode.js";
import { verifyEmail } from "../../services/user/user.service.js";
import Products from '../../models/productSchema.model.js';

export const showHomePage = async (req, res) => {
  try {
    let userData = req.user || null;

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

    console.log(products);

    res.render("user/home/index", {
      user: userData,
      products: formattedProducts,
    });
  } catch (error) {
    console.log(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Failed to load homepage");
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;
    // Verify OTP for forgot password
    await verifyEmail(email, otp, purpose);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    next(err);
  }
};
