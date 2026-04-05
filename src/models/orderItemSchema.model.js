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

    quantity: Number,

    pricing: {
      regularPrice: Number,
      basePrice: Number,
      gstRate: Number,
      gstAmount: Number,
      finalPrice: Number,
      total: Number,
      discountAmount: Number,
    },

    // ITEM LEVEL STATUS
    itemStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "placed",
    },

    cancelReason: String,
    returnReason: String,
  },
  { timestamps: true },
);

export default mongoose.model("OrderItem", orderItemSchema);
