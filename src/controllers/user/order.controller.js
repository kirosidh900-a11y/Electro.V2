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
    console.log("Place oder hited", userId);
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
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getOrderSuccessPage = async (req, res, next) => {
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

export const getOrderListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const search = req.query.search || "";

    const userId = req.user._id;
    console.log("Enterd");

    // 🔥 AJAX MODE
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

    // 🔥 INITIAL SERVER RENDER (IMPORTANT FIX)
    const orderData = await getOrderListService({
      userId,
      page,
      limit,
      search,
    });

    res.render("user/orders/orderList", {
      orders: orderData.orders, // ✅ send real data
      currentPage: page,
      totalPages: orderData.totalPages,
    });
  } catch (error) {
    console.error("Order List Controller Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getOrderDetailsPage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderItemId } = req.params;

    // VALIDATE ID
    if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
      return res.redirect("/orders");
    }

    //GET FULL DATA
    const data = await getOrderDetailsService({
      userId,
      orderItemId,
    });

    if (!data) {
      return res.redirect("/orders");
    }

    // SEND TO EJS
    res.render("user/orders/orderDetails", {
      order: {
        _id: data.orderId,
        orderNumber: data.orderNumber,
        shippingAddress: data.shippingAddress,
        payment: data.payment,
        orderStatus: data.orderStatus,
        delivery: data.delivery,
        pricing: data.pricing,
        isCancelled: data.isCancelled,
        cancelReason: data.cancelReason,
        cancelComments: data.cancelComments,
        cancelledAt: data.cancelledAt,
        updatedAt: data.updatedAt,
      },
      product: data.product,
      orderItemId,
    });
  } catch (error) {
    console.error("Order Details Error:", error);
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason, comments } = req.body;

    await cancelOrderService({ userId, orderId, reason, comments });

    res.status(200).json({ success: true, message: "Order cancelled successfully" });
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
