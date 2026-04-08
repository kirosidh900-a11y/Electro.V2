import {
  getAdminOrderDetailsService,
  getAdminOrdersService,
  updateOrderStatusService,
  cancelOrderService,
} from "../../services/admin/order.service.js";
import renderView from "../../utils/admin/renderView.util.js";

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
      req.xhr || req.headers.accept?.includes("json") || req.query.ajax === "1";

    if (isAjax) {
      // RENDER PARTIALS TO STRING
      const rows = await renderView(res, "admin/orders/partials/orderRows", {
        orders,
        currentPage: page,
        limit,
      });

      const pagination = await renderView(
        res,
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
      );

      // SEND JSON RESPONSE
      return res.json({
        success: true,
        rows,
        pagination,
        count: orders.length,
      });
    }

    //NORMAL PAGE LOAD
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

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    await updateOrderStatusService(orderId, status);

    return res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason, comments } = req.body;

    await cancelOrderService(orderId, reason, comments);

    return res.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrderDetailsPage = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const data = await getAdminOrderDetailsService(orderId);

    return res.render("admin/orders/details", {
      title: "Order Details",
      order: data.order,
      items: data.items,
      user: data.user,
    });
  } catch (error) {
    console.error("Admin Order Details Error:", error);
    next(error);
  }
};
