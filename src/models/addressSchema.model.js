import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
    },
    altPhone: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
      default: null,
    },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Invalid pincode"],
    },

    locality: {
      type: String,
      required: true,
    },

    landmark: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },
    stateCode: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },

    addressType: {
      type: String,
      enum: ["home", "work"],
      default: "home",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ADD MIDDLEWARE HERE (inside schema file)
addressSchema.pre("save", async function () {
  // Only act when isDefault is being changed to true
  if (this.isModified("isDefault") && this.isDefault) {
    await mongoose.model("Address").updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }

  // Auto-assign default if this is the only address and none is set
  if (this.isNew) {
    const existingDefault = await mongoose.model("Address").findOne({
      userId: this.userId,
      isDefault: true,
    });
    if (!existingDefault) {
      this.isDefault = true;
    }
  }
});

addressSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  const set = update?.$set || update;

  // Only unset others when explicitly setting isDefault: true
  if (set?.isDefault === true) {
    const filter = this.getFilter();
    const userId = filter.userId;
    if (userId) {
      await mongoose.model("Address").updateMany(
        { userId, _id: { $ne: filter._id } },
        { $set: { isDefault: false } }
      );
    }
  }
});

addressSchema.index({ userId: 1 });

export default mongoose.model("Address", addressSchema);
