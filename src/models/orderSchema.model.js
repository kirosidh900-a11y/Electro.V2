import mongoose from "mongoose";

const { Schema, Types } = mongoose;

// ORDER ITEM SUB-SCHEMA
const orderItemSchema = new Schema(
  {
    productId: {
      type: Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: Types.ObjectId,
      required: true,
    },

    name: String, // snapshot
    brand: String,

    attributes: {
      color: String,
      size: String,
      ram: String,
      rom: String,
    },

    images: [String], // snapshot

    quantity: {
      type: Number,
      required: true,
    },

    pricing: {
      regularPrice: Number,
      salePrice: Number,
      finalPrice: Number,

      discountAmount: Number,
      gstRate: Number,
      gstAmount: Number,

      total: Number, // finalPrice * quantity
    },
  },
  { _id: false },
);

// MAIN ORDER SCHEMA
const orderSchema = new Schema(
  {
    // USER
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    // UNIQUE ORDER NUMBER
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    // ITEMS
    items: [orderItemSchema],

    // PRICING SUMMARY
    pricing: {
      subtotal: { type: Number, required: true },
      productDiscount: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      gstTotal: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      finalAmount: { type: Number, required: true },
    },

    // COUPON
    coupon: {
      code: String,
      discountAmount: Number,
    },

    // SHIPPING ADDRESS SNAPSHOT
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

    // PAYMENT
    payment: {
      method: {
        type: String,
        enum: ["cod", "razorpay"],
        required: true,
      },

      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },

      transactionId: String,
      paymentGatewayOrderId: String,
    },

    // ORDER STATUS
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
        "returned",
      ],
      default: "pending",
    },

    // STATUS HISTORY
    statusHistory: [
      {
        status: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],

    // FLAGS
    isCancelled: {
      type: Boolean,
      default: false,
    },

    cancelReason: String,

    // DELIVERY
    delivery: {
      expectedDate: Date,
      deliveredAt: Date,
    },

    // EXTRA NOTES
    notes: String,
  },
  {
    timestamps: true,
  },
);

// UNIQUE ORDER NUMBER GENERATOR (RETRY SAFE)
orderSchema.pre("save", async function () {
  if (!this.isNew) return;

  let isUnique = false;

  while (!isUnique) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const randomPart = Math.floor(1000 + Math.random() * 9000);

    const orderNumber = `ORD-${datePart}-${randomPart}`;

    const existing = await mongoose.model("Order").findOne({ orderNumber });

    if (!existing) {
      this.orderNumber = orderNumber;
      isUnique = true;
    }
  }
});

// AUTO STATUS HISTORY INIT
orderSchema.pre("save", async function () {
  if (!this.isNew) return;

  let isUnique = false;

  while (!isUnique) {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const randomPart = Math.floor(1000 + Math.random() * 9000);

    const orderNumber = `ORD-${datePart}-${randomPart}`;

    const existing = await mongoose
      .model("Order")
      .findOne({ orderNumber });

    if (!existing) {
      this.orderNumber = orderNumber;
      isUnique = true;
    }
  }
});

// INDEXES (PERFORMANCE)
orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model("Order", orderSchema);
