import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true   // only index if exists
    },

    password: {
      type: String,
      required: true
    },

    referral_by: {
      type: String
      
    },

    referral: {
      type: String,
      required: true,
      unique: true
    },

    isBlock: {
      type: Boolean,
      default: false
    },

    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;