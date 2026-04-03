import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    discount_type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    target_model: {
      type: String,
      enum: ["Product", "Category", "Brand"],
    },
    discount: {
      type: Number,
      required: true,
    },
    max_discount: {
      type: Number,
    },
    target_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "target_model", // dynamic reference
      },
    ],
    applies_to: {
      type: String,
      enum: ["product", "category", "brand", "all"],
      required: true,
    },

    start_date: {
      type: Date,
      required: true,
    },

    end_date: {
      type: Date,
      required: true,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Offer", offerSchema);
