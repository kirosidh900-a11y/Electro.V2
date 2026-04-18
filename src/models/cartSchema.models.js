import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Applied coupon
    appliedCoupon: {
      code:           { type: String, default: null },
      couponId:       { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
      discountAmount: { type: Number, default: 0 },
    },

    couponDiscountAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Cart", cartSchema);
