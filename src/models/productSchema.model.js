import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
  },

  price: {
    type: Number,
    required: true,
  },

  stock: {
    type: Number,
    default: 0,
  },

  attributes: {
    type: Map,
    of: String,
  },
  product_images: [
    {
      url: {
        type: String,
        required: true,
      },
      imageId: {
        type: String,
        required: true,
      },
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ["listed", "unlisted"],
      default: "unlisted",
    },

    /* product level attributes */
    attributes: {
      type: Map,
      of: String,
    },

    /* variants */
    variants: {
      type: [variantSchema],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isDeleted: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
