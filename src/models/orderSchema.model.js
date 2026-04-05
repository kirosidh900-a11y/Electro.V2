import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const orderSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    // only summary

    pricing: {
      subtotal: Number,
      productDiscount: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      gstTotal: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      finalAmount: Number,
    },

    coupon: {
      code: String,
      discountAmount: Number,
    },

    shippingAddress: {
      name: String,
      phone: String,
      altPhone: String,

      address: String,
      locality: String,
      landmark: String,

      city: String,
      district: String,
      state: String,
      pincode: String,

      addressType: {
        type: String,
        enum: ["home", "work"],
      },
    },

    payment: {
      method: {
        type: String,
        enum: ["cod", "razorpay"],
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
    },

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

    delivery: {
      expectedDate: Date,
      deliveredAt: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
