import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "password_reset"],
      required: true,
    },

    // TEMP signup data
    tempUserData: {
      name: String,
      phone: String,
      password: String,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);
