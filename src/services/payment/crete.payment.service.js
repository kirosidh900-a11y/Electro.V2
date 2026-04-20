import razorpay from "../../config/razorpay.config.js";

export const createPaymentOrder = async ({
  amount,
  currency = "INR",
  receipt,
  purpose,
  userId,
  metadata = {},
}) => {
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency,
    receipt,
    metadata,
  });

  return {
    razorpayOrderId: order.id,
    amount,
    purpose,
    userId,
    metadata,
  };
};

export const createRazorpayOrder = async (amount) => {
  return razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
  });
};
