import cron from "node-cron";
import Order from "../models/orderSchema.model.js";
import orderItem from "../models/orderItemSchema.model.js";
import Products from "../models/productSchema.model.js";

const startPaymentExpiryJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("⏳ Checking expired payments...");

    // Match orders that are still in pending_payment state AND whose expiry has passed.
    // payment.status can be "pending" (never attempted) or "failed" (attempted but dismissed/failed)
    // — both are eligible for expiry cleanup.
    const expiredOrders = await Order.find({
      orderStatus: "pending_payment",
      "payment.status": { $in: ["pending", "failed"] },
      "payment.expiresAt": { $lt: new Date() },
    });

    for (const order of expiredOrders) {
      const items = await orderItem.find({ orderId: order._id });

      for (const item of items) {
        // Release reserved stock — safe check prevents going below 0
        await Products.updateOne(
          {
            _id: item.productId,
            variants: {
              $elemMatch: {
                _id:      item.variantId,
                reserved: { $gte: item.quantity },
              },
            },
          },
          {
            $inc: { "variants.$.reserved": -item.quantity },
          },
        );

        // Emit real-time stock update
        const updatedProduct = await Products.findById(item.productId).select("variants").lean();
        const variant = updatedProduct?.variants?.find(v => String(v._id) === String(item.variantId));
        if (variant && global.io) {
          global.io.emit("stockUpdated", {
            productId: item.productId,
            variantId: item.variantId,
            stock: Math.max(variant.stock - (variant.reserved || 0), 0),
          });
        }
      }

      // Cancel the order — this is the only place reserved stock is released
      order.payment.status = "failed";
      order.orderStatus = "cancelled";
      await order.save();

      console.log(`❌ Expired order cancelled: ${order._id}`);
    }
  });
};

export default startPaymentExpiryJob;
