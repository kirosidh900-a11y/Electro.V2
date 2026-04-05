import {
  placeOrderService,
  getOrderSuccessService,
} from "../../services/user/order.service.js";

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

    // 🔥 fallback (better UX)
    return res.redirect("/cart");
  }
};