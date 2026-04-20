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
        enum: ["cod", "razorpay", "wallet"],
        required: true,
      },

      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },

      transactionId: String,
      paymentGatewayOrderId: String,
      signature: String,
      refundedAt: Date,
      expiresAt: Date,
      walletDeducted: { type: Number, default: 0 }, // amount paid via wallet
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "placed",
        "pending_payment",
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
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
