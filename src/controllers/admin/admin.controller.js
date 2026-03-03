import HTTP_STATUS from "../../constant/statusCode.js";
import User from "../../models/userSchema.model.js";

export const dashboard = (req, res) => {
  let adminData = null;

  if (req.admin) {
    adminData = req.admin;
  }

  res.render("admin/home/dashboard", {
    admin: adminData,
  });
};

export const customers = async (req, res, next) => {
  try {
    const adminData = req.admin || null;

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const totalCustomers = await User.countDocuments({ isAdmin: false });

    const customers = await User.find({ isAdmin: false })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalCustomers / limit);

    res.render("admin/home/customers", {
      admin: adminData,
      customers,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleBlockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found"
      });
    }

    user.isBlock = !user.isBlock;
    await user.save();

    res.json({
      success: true,
      isBlock: user.isBlock
    });

  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong"
    });
  }
};