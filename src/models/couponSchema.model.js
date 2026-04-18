import mongoose from "mongoose";

const { Schema, model } = mongoose;

const couponSchema = new Schema(
  {

    //    BASIC INFO
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },


    //   DISCOUNT
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // Only for percentage coupons
    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },


    //  ORDER RULES
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },


    //   USAGE LIMITS
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    perUserLimit: {
      type: Number,
      default: null,
      min: 1,
    },

    usedBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        usedCount: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],


    //   VALIDITY
    startDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },


    //   STATUS

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


//  INDEXES
couponSchema.index({ code: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });


//  VALIDATIONS
couponSchema.pre("validate", function () {
  if (this.startDate && this.expiryDate && this.expiryDate < this.startDate) {
    throw new Error("Expiry date must be after start date");
  }

  // maxDiscount only applies to percentage type
  if (this.discountType === "fixed") {
    this.maxDiscount = null;
  }
});


//  VIRTUALS
// Coupon Status
couponSchema.virtual("status").get(function () {
  const now = new Date();

  if (!this.isActive) return "inactive";
  if (this.expiryDate < now) return "expired";
  if (this.startDate > now) return "upcoming";
  if (this.isExhausted) return "exhausted";

  return "active";
});

// Fully used?
couponSchema.virtual("isExhausted").get(function () {
  return (
    this.usageLimit !== null &&
    this.usedCount >= this.usageLimit
  );
});

// Days left
couponSchema.virtual("daysLeft").get(function () {
  const now = new Date();

  if (this.expiryDate < now) return 0;

  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

//  INSTANCE METHODS

// Check if coupon usable
couponSchema.methods.isValidCoupon = function () {
  return this.status === "active";
};

//  EXPORT
export default model("Coupon", couponSchema);