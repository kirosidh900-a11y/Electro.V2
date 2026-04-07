import mongoose from "mongoose";
import {
  placeOrderService,
  getOrderSuccessService,
  getOrderListService,
  getOrderDetailsService,
  cancelOrderService,
  returnOrderItemService,
} from "../../services/user/order.service.js";
import renderView from "../../utils/admin/renderView.util.js";

export const placeOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { addressId, paymentMethod } = req.body;

    const order = await placeOrderService({
      userId,
      addressId,
      paymentMethod,
    });

    return res.json({
      success: true,
      orderId: order.orderId,
      redirectUrl: `/order/success/${order.orderId}`,
    });
  } catch (err) {
    console.error("Order Error:", err);
    next(err);
  }
};

export const getOrderSuccessPage = async (req, res) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.orderId;

    const order = await getOrderSuccessService({ userId, orderId });

    return res.render("user/orders/orderSuccess", {
      order,
      orderId: order._id,
      orderNumber: order.orderNumber,
      expectedDelivery: order.delivery?.expectedDate,
    });
  } catch (err) {
    console.error("Order Success Error:", err);

    return res.redirect("/cart");
  }
};

export const getOrderListingPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const search = req.query.search || "";

    const userId = req.user._id;
    
    // AJAX MODE
    if (req.headers.accept?.includes("application/json")) {
      const orderData = await getOrderListService({
        userId,
        page,
        limit,
        search,
      });

      const cardsHtml = await renderView(
        res,
        "user/orders/partials/orderCards",
        { orders: orderData.orders },
      );

      const paginationHtml = await renderView(
        res,
        "user/orders/partials/orderPagination",
        {
          currentPage: page,
          totalPages: orderData.totalPages,
        },
      );

      return res.json({
        success: true,
        cards: cardsHtml,
        pagination: paginationHtml,
        totalOrders: orderData.total,
        currentCount: orderData.orders.length,
      });
    }

    // INITIAL SERVER RENDER 
    const orderData = await getOrderListService({
      userId,
      page,
      limit,
      search,
    });

    return res.render("user/orders/orderList", {
      orders: orderData.orders, 
      currentPage: page,
      totalPages: orderData.totalPages,
    });
  } catch (error) {
    console.error("Order List Controller Error:", error);
    next(error);
  }
};

export const getOrderDetailsPage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.redirect("/orders");

    const data = await getOrderDetailsService({ userId, orderId });

    if (!data) return res.redirect("/orders");

    return res.render("user/orders/orderDetails", {
      order: data.order,
      items: data.items,
    });
  } catch (error) {
    console.error("Order Details Error:", error);
    return next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId, itemId } = req.params; 
    const { reason, comments } = req.body;

    console.log("Cancel Order Request:", { userId, orderId, itemId, reason, comments });

    const result = await cancelOrderService({
      userId,
      orderId,
      itemId,  
      reason,
      comments,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error("Cancel Order Error:", error);
    next(error);
  }
};

export const returnOrderItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderItemId } = req.params;
    const { returnReason, returnComments } = req.body;

    await returnOrderItemService({ userId, orderItemId, returnReason, returnComments });

    res.status(200).json({ success: true, message: "Return request submitted successfully" });
  } catch (error) {
    console.error("Return Order Error:", error);
    next(error);
  }
};
