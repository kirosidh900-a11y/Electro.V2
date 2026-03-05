import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    data_type: {
      type: String,
      enum: ["text", "number", "select"],
      required: true,
    },

    unit: {
      type: String,
      trim: true,
      default: null,
    },

    allowed_values: {
      type: [String],
      default: [],
    },

    is_required: {
      type: Boolean,
      default: false,
    },

    is_variant_level: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["listed", "unlisted"],
      default: "unlisted",
    },

    attributes: {
      type: [attributeSchema],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/* Indexes */

// attribute search optimization
categorySchema.index({ "attributes.key": 1 });

// useful for filtering active categories
categorySchema.index({ isDeleted: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
