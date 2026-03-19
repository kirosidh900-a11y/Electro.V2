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
  { timestamps: true }
);

// useful for filtering active Brands
brandSchema.index({isDeleted:1})

const Brand = mongoose.model('Brand',brandSchema);


export default Brand;