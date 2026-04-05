import mongoose from "mongoose";
import {
  placeOrderService,
  getOrderSuccessService,
  getOrderListService,
  getOrderDetailsService,
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
    console.log('Enterd')

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

export const getOrderDetailsPage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    // VALIDATE OBJECT ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.redirect("/orders");
    }

    const order = await getOrderDetailsService({
      userId,
      orderId,
    });

    console.log(order)

    if (!order) {
      return res.redirect("/orders");
    }

    return res.render("user/orders/orderDetails", {
      order,
    });
  } catch (error) {
    console.error("Order Details Error:", error);
    next(error)
  }
};