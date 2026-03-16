import HTTP_STATUS from "../../constant/statusCode.js";
import Products from "../../models/productSchema.model.js";

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

    console.log(formattedProducts);

    res.render("user/home/index", {
      products: formattedProducts,
    });
  } catch (error) {
    console.log(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send("Failed to load homepage");
  }
};

export const profilePage = async (req, res, next) => {
  try {
    console.log(res.locals.user);
    res.render("user/home/profile");
  } catch (error) {
    console.log("Profile Page Error:", error);
    next(error);
  }
};
