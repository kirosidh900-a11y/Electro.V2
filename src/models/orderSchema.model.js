import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const orderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },

    orderNumber: { type: String, unique: true, index: true },

    pricing: {
      subtotal: Number,
      productDiscount: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      gstTotal: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      finalAmount: Number,
    },

    shippingAddress: { /* same as yours */ },

    payment: { /* same as yours */ },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "placed",
        "confirmed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    isCancelled: {
      type: Boolean,
      default: false,
    },

    cancelReason: String,
    cancelComments: String,
    cancelledAt: Date,

    delivery: {
      expectedDate: Date,
      deliveredAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
