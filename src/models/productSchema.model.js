import mongoose from "mongoose";
import AppError from "../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../constant/statusCode.js";

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

productSchema.pre("save", async function () {
  const skus = this.variants.map((v) => v.sku.toLowerCase());

  if (new Set(skus).size !== skus.length) {
    return next(
      new AppError("Duplicate SKU inside product", HTTP_STATUS.BAD_REQUEST),
    );
  }

  const exists = await this.constructor.exists({
    _id: { $ne: this._id },
    "variants.sku": { $in: skus },
  });

  if (exists) {
    return next(
      new AppError("SKU already exists globally", HTTP_STATUS.CONFLICT),
    );
  }
});

productSchema.index({ "variants.sku": 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isDeleted: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
