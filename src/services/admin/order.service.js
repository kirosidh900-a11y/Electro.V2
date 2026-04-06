import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
// LABELS (MOVE HERE)
const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const PAYMENT_METHOD_LABELS = {
  cod: "COD",
  razorpay: "Razorpay",
};

// DATE FILTER BUILDER
const buildDateMatch = (dateRange) => {
  const now = new Date();
  const start = new Date();

  switch (dateRange) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { createdAt: { $gte: start } };

    case "7d":
      start.setDate(now.getDate() - 7);
      return { createdAt: { $gte: start } };

    case "30d":
      start.setDate(now.getDate() - 30);
      return { createdAt: { $gte: start } };

    default:
      return {};
  }
};

// MAIN SERVICE
export const getAdminOrdersService = async ({
  page = 1,
  limit = 5,
  search = "",
  status = "",
  paymentStatus = "",
  dateRange = "",
}) => {
  const skip = (page - 1) * limit;

  const pipeline = [];

  // OIN USER
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  //MATCH FILTERS
  const match = {};

  if (status) match.orderStatus = status;
  if (paymentStatus) match["payment.status"] = paymentStatus;

  Object.assign(match, buildDateMatch(dateRange));

  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  // SEARCH (ORDER + USER)
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { orderNumber: { $regex: search, $options: "i" } },
          { "user.name": { $regex: search, $options: "i" } },
          { "user.email": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  //SORT + PAGINATION
  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  );

  // EXECUTE
  const orders = await Order.aggregate(pipeline);

  // TOTAL COUNT
  const total = await Order.countDocuments(match);

  // FORMAT
  const formattedOrders = await Promise.all(
    orders.map(async (o) => {
      const count = await orderItem.countDocuments({ orderId: o._id });

      return {
        ...o,
        itemsCount: count,
        statusLabel: STATUS_LABELS[o.orderStatus] || o.orderStatus,
        paymentStatusLabel:
          PAYMENT_STATUS_LABELS[o.payment?.status] || o.payment?.status,
        paymentMethodLabel:
          PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method,
      };
    }),
  );

  return {
    orders: formattedOrders,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAdminOrderDetailsService = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("userId", "name email phone createdAt isBlock")
    .lean();

  if (!order) throw new Error("Order not found");

  const items = await orderItem.find({ orderId }).lean();

  return {
    order,
    items,
    user: order.userId,
  };
};

export const updateOrderStatusService = async (orderId, status) => {
  const validStatuses = ["placed", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  // ORDER LEVEL UPDATE
  const orderUpdate = { orderStatus: status };
  if (status === "delivered") orderUpdate["delivery.deliveredAt"] = new Date();

  await Order.findByIdAndUpdate(orderId, orderUpdate);

  // ITEM STATUS MAPPING (item enum: placed, confirmed, shipped, delivered, cancelled, returned)
  const itemStatusMap = {
    placed:           "placed",
    confirmed:        "confirmed",
    shipped:          "shipped",
    out_for_delivery: "shipped",   // no out_for_delivery in item enum
    delivered:        "delivered",
    cancelled:        "cancelled",
  };

  const itemStatus = itemStatusMap[status];
  if (itemStatus) {
    // only update items that are not already cancelled or returned
    await orderItem.updateMany(
      { orderId, itemStatus: { $nin: ["cancelled", "returned"] } },
      { itemStatus }
    );
  }
};

export const cancelOrderService = async (orderId, reason, comments) => {
  await Order.findByIdAndUpdate(orderId, {
    orderStatus: "cancelled",
    isCancelled: true,
    cancelReason: reason,
    cancelComments: comments,
    cancelledAt: new Date(),
  });

  // only cancel items not already returned
  await orderItem.updateMany(
    { orderId, itemStatus: { $ne: "returned" } },
    { itemStatus: "cancelled", cancelReason: reason }
  );
};
