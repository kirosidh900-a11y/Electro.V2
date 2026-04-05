import { placeOrderService } from "../../services/user/order.service.js";

export const placeOrder = async (req, res, next) => {



  
  try {
    const userId = req.user._id;
    console.log('Place oder hited',userId)
    const { addressId, paymentMethod } = req.body;

    const result = await placeOrderService({
      userId,
      addressId,
      paymentMethod,
    });

   return res.json(result);

  } catch (err) {
    console.error("Order Error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};