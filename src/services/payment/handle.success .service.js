import { verifyPayment } from "./verify.payment.service.js";

export const handlePaymentSuccess = async (req, res) => {
  const { paymentData, purpose } = req.body;

  const isValid = verifyPayment(paymentData);

  if (!isValid) throw new Error("Payment failed");

  switch (purpose) {
    case "ORDER":
      // update order status → paid
      break;

    case "WALLET":
      // add money to wallet
      break;

    case "WISHLIST":
      // store reserved amount for wishlist
      break;
  }

  res.json({ success: true });
};

export const handlePaymentFailure = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  const items = await orderItem.find({ orderId });

  // 🔥 RELEASE RESERVED STOCK
  for (const item of items) {
    await Products.updateOne(
      {
        _id: item.productId,
        "variants._id": item.variantId,
      },
      {
        $inc: {
          "variants.$.reserved": -item.quantity,
        },
      }
    );
  }

  order.payment.status = "failed";
  order.orderStatus = "cancelled";

  await order.save();

  res.json({ success: true });
};