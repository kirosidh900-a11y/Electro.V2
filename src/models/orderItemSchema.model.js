import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const orderItemSchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: Types.ObjectId,
      ref: "Product",
    },

    variantId: Types.ObjectId,

    name: String,
    brand: String,

    attributes: Object,
    images: [String],

    quantity: {
      type: Number,
      required: true,
    },

    pricing: {
      regularPrice: Number,
      basePrice: Number,
      gstRate: Number,
      gstAmount: Number,
      finalPrice: Number,
      total: Number,
      discountAmount: Number,
    },

    // =============================
    // 📦 ITEM STATUS
    // =============================
    itemStatus: {
      type: String,
      enum: [
        "placed",
        "pending_payment",
        "confirmed",
        "shipped",
        "out_for_delivery",
        "delivered",

        "cancel_requested",
        "cancelled",

        "return_requested",
        "return_approved",
        "pickup_scheduled",   // 🔥 NEW
        "return_rejected",
        "returned",

        "refund_pending",
        "refund_processed",
      ],
      default: "placed",
      index: true,
    },

    // =============================
    // 🔴 CANCEL INFO
    // =============================
    cancel: {
      reason: String,
      comments: String,
      requestedAt: Date,
      cancelledAt: Date,
    },

    // =============================
    // 🟣 RETURN INFO
    // =============================
    return: {
      reason: String,
      comments: String,
      requestedAt: Date,

      approvedAt: Date,
      rejectedAt: Date,

      pickupDate: Date,          // 🔥 NEW
      pickupScheduledAt: Date,   // 🔥 NEW
      pickupCompletedAt: Date,   // 🔥 NEW (optional)

      completedAt: Date,
      rejectReason: String,
    },

    // =============================
    // 💰 REFUND INFO
    // =============================
    refund: {
      status: {
        type: String,
        enum: ["none", "pending", "processed"],
        default: "none",
      },
      amount: Number,
      processedAt: Date,
    },
  },
  { timestamps: true }
);

orderItemSchema.index({ itemStatus: 1, "return.pickupDate": 1 });

export default mongoose.model("OrderItem", orderItemSchema);