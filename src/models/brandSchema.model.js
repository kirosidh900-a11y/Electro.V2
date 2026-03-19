import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["listed", "unlisted"],
      default: "unlisted",
      lowercase: true,
    },
    logo: {
      type: String,
      required: true,
    },
    brandId: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// pagination + sorting optimization
brandSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

// unique only for active brands
brandSchema.index(
  { title: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

const Brand = mongoose.model("Brand", brandSchema);

export default Brand;
