import {
  getAdminOrderDetailsService,
  getAdminOrdersService,
  updateOrderStatusService,
  cancelOrderService,
  handleReturnRequestService,
  schedulePickupService,
  completeReturnService,
  updateItemStatusService,
} from "../../services/admin/order.service.js";import renderView from "../../utils/admin/renderView.util.js";

export const getAdminOrdersPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;

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
    const { reason, comments, refundMethod, internalNote } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: "Cancel reason is required" });

    const result = await cancelOrderService(orderId, { reason, comments, refundMethod, internalNote });

    return res.json({
      success: true,
      message: "Order cancelled",
      refundRequired:  result.refundRequired,
      refundAmount:    result.refundAmount,
      refundStatus:    result.refundStatus,
      resolvedMethod:  result.resolvedMethod,
    });
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
      itemCount: data.itemCount,
      isSingleItem: data.isSingleItem,
    });
  } catch (error) {
    console.error("Admin Order Details Error:", error);
    next(error);
  }
};

export const handleReturnController = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { action, rejectReason } = req.body;

    await handleReturnRequestService({
      orderItemId: itemId,
      action,
      rejectReason,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const schedulePickupController = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { pickupDate } = req.body;

    await schedulePickupService({ orderItemId: itemId, pickupDate });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const completeReturnController = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    await completeReturnService(itemId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const updateItemStatus = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status, reason, comment } = req.body;

    if (!status) return res.status(400).json({ success: false, message: "Status is required" });

    await updateItemStatusService(itemId, status, reason, comment);
    res.json({ success: true, message: "Item status updated" });
  } catch (err) {
    next(err);
  }
};

export const processItemRefundController = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { orderId } = req.body;

    if (!orderId) return res.status(400).json({ success: false, message: "orderId required" });

    const OrderItem = (await import("../../models/orderItemSchema.model.js")).default;
    const Order     = (await import("../../models/orderSchema.model.js")).default;
    const { processItemRefund } = await import("../../services/product/refund.service.js");

    const item  = await OrderItem.findById(itemId);
    const order = await Order.findById(orderId);

    if (!item || !order) return res.status(404).json({ success: false, message: "Item or order not found" });
    if (item.refund?.status === "processed") return res.status(400).json({ success: false, message: "Already refunded" });

    const refundAmount = await processItemRefund({
      orderItemId: itemId,
      orderId,
      userId:  order.userId,
      reason:  "admin_manual",
      isCOD:   order.payment.method === "cod",
    });

    res.json({ success: true, message: "Refund processed", refundAmount });
  } catch (err) {
    next(err);
  }
};
