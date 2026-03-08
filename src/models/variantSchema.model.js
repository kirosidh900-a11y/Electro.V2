import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    stock: {
      type: Number,
      required: true,
    },

    reserved_stock: {
      type: Number,
      default: 0,
    },

    attributes: {
      type: Object,
      default: {},
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["listed", "unlisted"],
      default: "listed",
      required: true,
    },

    product_image: [
      {
        type: String,
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const ProductVariant = mongoose.model("product_variant", variantSchema);

export default ProductVariant;