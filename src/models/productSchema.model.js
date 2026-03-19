import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // 🔥 normalize automatically
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      required: true,
    },

    attributes: {
      type: Map,
      of: String,
      default: {},
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
  },
  { timestamps: true }, // 🔥 IMPORTANT
);

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

productSchema.pre("save", function (next) {
  const skus = this.variants.map((v) => v.sku);

  const hasDuplicate = new Set(skus).size !== skus.length;

  if (hasDuplicate) {
    return next(new Error("Duplicate SKU inside product"));
  }

  next();
});

productSchema.index({ "variants.sku": 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isDeleted: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
