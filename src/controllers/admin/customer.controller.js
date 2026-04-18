import renderView from "../../utils/admin/renderView.util.js";

import {
  getCustomersService,
  toggleBlockCustomerService,
  getCustomerDetailService,
} from "../../services/admin/customer.service.js";

//Customers
export const customers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 6;

    const search = req.query.search || "";
    const status = req.query.status || "All";

    const { customers, totalPages, currentPage } = await getCustomersService({
      page,
      limit,
      search,
      status,
    });

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

    res.locals.title = "Customer Management";

    // normal page load
    res.render("admin/home/customers", {
      customers,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error("Customer Page load Error :", error);
    res.json({ success: false, message: error.message });
  }
};

export const toggleBlockCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isBlock = await toggleBlockCustomerService(id);
    res.json({ success: true, isBlock });
  } catch (error) {
    console.error("toggleBlockCustomerError:", error);
    next(error);
  }
};

export const getCustomerDetail = async (req, res, next) => {
  try {
    const data = await getCustomerDetailService(req.params.id);
    res.render("admin/home/customerDetail", { ...data, title: "Customer Profile" });
  } catch (err) {
    next(err);
  }
};
