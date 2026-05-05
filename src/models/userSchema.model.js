import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      sparse: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      default: null,
    },

    referral_by: {
      type: String,
      sparse: true,
    },

    referralCode: {
      type: String,
      required: true,
      unique: true,
    },

    referralCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 6,
    },

    isBlock: {
      type: Boolean,
      default: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    photo: {
      type: String,
      sparse: true,
    },
    photoId: {
      type: String,
      sparse: true,
    },
  },
  { timestamps: true },
);

// For Search
userSchema.index({ name: 1 });
userSchema.index({ isBlock: 1 });

const User = mongoose.model("User", userSchema);

export default User;
