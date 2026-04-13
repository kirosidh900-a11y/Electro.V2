import cron from "node-cron";
import Order from "../models/orderSchema.model.js";
import orderItem from "../models/orderItemSchema.model.js";
import Products from "../models/productSchema.model.js";

const startPaymentExpiryJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("⏳ Checking expired payments...");

    const expiredOrders = await Order.find({
      orderStatus: "pending_payment",
      "payment.status": "pending",
      "payment.expiresAt": { $lt: new Date() },
    });

    for (const order of expiredOrders) {
      const items = await orderItem.find({ orderId: order._id });

      for (const item of items) {
        await Products.updateOne(
          {
            _id: item.productId,
            variants: {
              $elemMatch: {
                _id: item.variantId,
                reserved: { $gte: item.quantity }, // 🔥 SAFE CHECK
              },
            },
          },
          {
            $inc: {
              "variants.$.reserved": -item.quantity,
            },
          },
        );

        // 🔥 SOCKET
        const updatedProduct = await Products.findById(item.productId);
        const variant = updatedProduct.variants.id(item.variantId);

        const availableStock = variant.stock - (variant.reserved || 0);

        if (global.io) {
          global.io.emit("stockUpdated", {
            productId: item.productId,
            variantId: item.variantId,
            stock: availableStock,
          });
        }
      }

      // 🔥 UPDATE ORDER
      order.payment.status = "failed";
      order.orderStatus = "cancelled";

      await order.save();

      console.log(`❌ Expired order: ${order._id}`);
    }
  });
};

export default startPaymentExpiryJob;
