export const getCouponsPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    // Placeholder — replace with real DB query when model is ready
    const coupons = [];
    const total = 0;
    const totalPages = Math.ceil(total / limit);

    return res.render("admin/home/coupons", {
      coupons,
      currentPage: page,
      totalPages,
      title: "Coupon Management",
    });
  } catch (err) {
    next(err);
  }
};
