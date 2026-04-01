import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

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

    applies_to: {
      type: String,
      enum: ["product", "category", "brand", "all"],
      required: true,
    },

    target_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "applies_to", // dynamic reference
      },
    ],

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
  },
  { timestamps: true },
);

export default mongoose.model("Offer", offerSchema);
