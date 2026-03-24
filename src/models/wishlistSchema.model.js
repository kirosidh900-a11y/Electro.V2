import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
  ],
});

wishlistSchema.index(
  {
    userId: 1,
    "items.productId": 1,
    "items.variantId": 1,
  },
  { unique: true },
);

export default mongoose.model("Wishlist", wishlistSchema);
