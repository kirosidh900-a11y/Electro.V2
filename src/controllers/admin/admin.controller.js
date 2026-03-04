import HTTP_STATUS from "../../constant/statusCode.js";
import User from "../../models/userSchema.model.js";
import renderView from "../../utils/admin/renderView.util.js";

export const dashboard = (req, res) => {
  let adminData = null;

  if (req.admin) {
    adminData = req.admin;
  }

  res.render("admin/home/dashboard", {
    admin: adminData,
  });
};

export const customers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const query = {isAdmin:false};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (status === "Active") query.isBlock = false;
    if (status === "Blocked") query.isBlock = true;

    const totalCustomers = await User.countDocuments(query);

    const totalPages = Math.ceil(totalCustomers / limit);

    const customers = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const currentPage = page;

    // AJAX request
    if (req.xhr) {
      const rows = await renderView(res, "admin/home/partials/customerRows", {
        customers,
        currentPage,
      });

      const pagination = await renderView(
        res,
        "admin/home/partials/pagination",
        { currentPage, totalPages },
      );

      return res.json({ rows, pagination });
    }

    // normal page load
    res.render("admin/home/customers", {
      customers,
      currentPage,
      totalPages,
      title:'Customer Management'
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const toggleBlockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlock = !user.isBlock;
    await user.save();

    res.json({
      success: true,
      isBlock: user.isBlock,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
