import { getAdminOrdersService } from "../../services/admin/order.service.js";

export const getAdminOrdersPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const {
      search = "",
      status = "",
      paymentStatus = "",
      paymentMethod = "",
      dateRange = "",
    } = req.query;

    const { orders, totalPages } = await getAdminOrdersService({
      page,
      limit,
      search,
      status,
      paymentStatus,
      paymentMethod,
      dateRange,
    });

    // CHECK AJAX REQUEST
    const isAjax =
      req.xhr ||
      req.headers.accept?.includes("json") ||
      req.query.ajax === "1";

    if (isAjax) {
      // RENDER PARTIALS TO STRING
      const rows = await new Promise((resolve, reject) => {
        res.render(
          "admin/orders/partials/orderRows",
          { orders, currentPage: page, limit },
          (err, html) => {
            if (err) return reject(err);
            resolve(html);
          }
        );
      });

      const pagination = await new Promise((resolve, reject) => {
        res.render(
          "admin/orders/partials/pagination",
          {
            currentPage: page,
            totalPages,
            query: {
              search,
              status,
              paymentStatus,
              paymentMethod,
              dateRange,
              limit,
            },
          },
          (err, html) => {
            if (err) return reject(err);
            resolve(html);
          }
        );
      });

      // 🔥 SEND JSON RESPONSE
      return res.json({
        success: true,
        rows,
        pagination,
        count: orders.length,
      });
    }

    // 🔥 NORMAL PAGE LOAD
    return res.render("admin/orders/index", {
      title: "Orders",
      orders,
      currentPage: page,
      totalPages,
      search,
      status,
      paymentStatus,
      paymentMethod,
      dateRange,
      limit,
    });

  } catch (error) {
    console.error("Admin Orders Error:", error);

    if (!res.headersSent) {
      return next(error);
    }
  }
};