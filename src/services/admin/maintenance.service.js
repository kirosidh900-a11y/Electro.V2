import Order from "../../models/orderSchema.model.js";

export const getMaintenanceStatsService = async () => {
  const codOrdersNeedingFix = await Order.countDocuments({
    "payment.method": "cod",
    "payment.status": "pending",
    orderStatus: "delivered",
  });

  return { codOrdersNeedingFix };
};

export const fixCODPaymentsService = async () => {
  const ordersToFix = await Order.find({
    "payment.method": "cod",
    "payment.status": "pending",
    orderStatus: "delivered",
  })
    .select("orderNumber createdAt")
    .lean();

  if (ordersToFix.length === 0) {
    return { fixed: 0, orders: [] };
  }

  const result = await Order.updateMany(
    {
      "payment.method": "cod",
      "payment.status": "pending",
      orderStatus: "delivered",
    },
    {
      $set: {
        "payment.status": "paid",
        "payment.paidAt": new Date(),
      },
    },
  );

  return {
    fixed: result.modifiedCount,
    orders: ordersToFix.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
    })),
  };
};
