import Products from "../../models/productSchema.model.js";

export const getHomeProductsService = async () => {
  const products = await Products.find({
    status: "listed",
    isDeleted: false,
  })
    .populate({
      path: "brand",
      match: { status: "listed", isDeleted: false },
      select: "title status",
    })
    .populate({
      path: "category",
      match: { status: "listed", isDeleted: false },
      select: "title status",
    })
    .sort({ createdAt: -1 })
    .lean();

  const formattedProducts = products
    .filter((product) => {
      if (!product.brand || !product.category) return false;

      const validVariant = product.variants?.find(
        (v) => !v.isDeleted && v.stock > 0,
      );

      return !!validVariant;
    })
    .map((product) => {
      const variant = product.variants.find((v) => !v.isDeleted && v.stock > 0);

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand.title,
        category: product.category.title,
        variantId: variant._id,
        price: variant.price,
        stock: variant.stock,
        image: variant.product_images?.[0]?.url || null,
      };
    });

  return formattedProducts;
};
