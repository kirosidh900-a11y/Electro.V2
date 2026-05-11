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
        // ─── Release reserved stock ───────────────────────────────────────────
        // We match ONLY on variant _id (not on reserved amount) so the update
        // never silently skips a variant whose reserved count is already 0 or
        // less than item.quantity due to a previous partial release.
        const releaseResult = await Products.updateOne(
          {
            _id: item.productId,
            "variants._id": item.variantId,
          },
          {
            $inc: { "variants.$.reserved": -item.quantity },
          },
        );

        // Clamp reserved to 0 if the decrement pushed it negative
        // (safety net for double-release edge cases)
        if (releaseResult.modifiedCount > 0) {
          await Products.updateOne(
            {
              _id: item.productId,
              "variants._id": item.variantId,
              "variants.reserved": { $lt: 0 },
            },
            { $set: { "variants.$.reserved": 0 } },
          );
        }

        console.log(
          `🔓 Reserved stock released — product: ${item.productId} | variant: ${item.variantId} | qty: ${item.quantity} | modified: ${releaseResult.modifiedCount}`,
        );

        // Emit real-time stock update so the UI reflects the freed stock
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

      // Cancel the order
      order.payment.status = "failed";
      order.orderStatus = "cancelled";
      await order.save();

      console.log(`❌ Expired order cancelled: ${order._id}`);
    }
  });
};

export default startPaymentExpiryJob;

