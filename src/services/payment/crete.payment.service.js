import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

export const createPaymentOrder = async ({
  amount,
  currency = "INR",
  receipt,
  purpose,
  userId,
  metadata = {}
}) => {
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency,
    receipt
  });

  return {
    razorpayOrderId: order.id,
    amount,
    purpose,
    userId,
    metadata
  };
};

export const createRazorpayOrder = async (amount) => {
  return razorpay.orders.create({
    amount: amount * 100,
    currency: "INR"
  });
};