import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
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
    .populate("userId", "name email phone photo createdAt isBlock")
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
  const validStatuses = [
    "placed",
    "confirmed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) throw new AppError("Invalid status");

  // ORDER LEVEL UPDATE
  const orderUpdate = { orderStatus: status };
  if (status === "delivered") orderUpdate["delivery.deliveredAt"] = new Date();

  await Order.findByIdAndUpdate(orderId, orderUpdate);

  // ITEM STATUS MAPPING
  const itemStatusMap = {
    placed: "placed",
    confirmed: "confirmed",
    shipped: "shipped",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    cancelled: "cancelled",
  };

  const itemStatus = itemStatusMap[status];
  if (itemStatus) {
    // only update items that are not already cancelled or returned
    await orderItem.updateMany(
      { orderId, itemStatus: { $nin: ["cancelled", "returned"] } },
      { itemStatus },
    );
  }
};

export const cancelOrderService = async (orderId, reason, comments) => {
  await Order.findByIdAndUpdate(orderId, {
    orderStatus:    "cancelled",
    isCancelled:    true,
    cancelReason:   reason,
    cancelComments: comments,
    cancelledAt:    new Date(),
  });

  // Get items to rollback stock
  const items = await orderItem.find({
    orderId,
    itemStatus: { $nin: ["cancelled", "returned", "refund_processed"] },
  });

  for (const item of items) {
    // Restore stock
    await Products.updateOne(
      { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
      { $inc: { "variants.$.stock": item.quantity } },
    );

    item.itemStatus  = "cancelled";
    item.cancel      = { reason, comments, cancelledAt: new Date(), requestedAt: new Date() };
    await item.save();
  }
};

const handleReturnStock = async (item) => {
  const reason = item.return?.reason;

  // DO NOT RESTOCK for damaged/wrong/defective items
  if (["wrong_item", "defective", "damaged"].includes(reason)) return;

  // ✅ RESTOCK
  await Products.updateOne(
    { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
    { $inc: { "variants.$.stock": item.quantity } },
  );
};

export const handleReturnRequestService = async ({
  orderItemId,
  action,
  rejectReason,
}) => {
  const item = await orderItem.findById(orderItemId);

  if (!item) throw new AppError("Item not found");

  if (item.itemStatus !== "return_requested") {
    throw new AppError("Invalid return state — item must be in return_requested status");
  }

  // Ensure return subdoc exists
  if (!item.return) item.return = {};

  if (action === "approve") {
    item.itemStatus        = "return_approved";
    item.return.approvedAt = new Date();
    item.markModified("return");
  } else if (action === "reject") {
    item.itemStatus           = "return_rejected";
    item.return.rejectedAt    = new Date();
    item.return.rejectReason  = rejectReason || "No reason provided";
    item.markModified("return");
  } else {
    throw new AppError("Invalid action — must be approve or reject");
  }

  await item.save();
  return item;
};

export const schedulePickupService = async ({ orderItemId, pickupDate }) => {
  const item = await orderItem.findById(orderItemId);

  if (!item) throw new AppError("Item not found");

  if (item.itemStatus !== "return_approved") {
    throw new AppError("Return not approved yet");
  }

  item.itemStatus = "pickup_scheduled";
  item.return.pickupDate = new Date(pickupDate);
  item.return.pickupScheduledAt = new Date();

  await item.save();

  return item;
};

export const completeReturnService = async (orderItemId) => {
  const item = await orderItem.findById(orderItemId);

  if (!item) throw new AppError("Item not found");

  if (item.itemStatus !== "pickup_scheduled") {
    throw new AppError("Pickup not scheduled");
  }

  item.itemStatus = "returned";
  item.return.completedAt     = new Date();
  item.return.pickupCompletedAt = new Date();

  await handleReturnStock(item);
  await item.save();

  // 💰 REFUND — for razorpay, wallet, and COD (after return)
  const order = await Order.findById(item.orderId);
  if (order && ["razorpay", "wallet", "cod"].includes(order.payment.method)) {
    const { processItemRefund } = await import("../product/refund.service.js");
    await processItemRefund({
      orderItemId: item._id,
      orderId:     item.orderId,
      userId:      item.userId,
      reason:      "return",
      isCOD:       order.payment.method === "cod",
    });
  }

  return item;
};

// ── Admin: update a single item's status ─────────────────────────────────────
const VALID_ITEM_STATUSES = [
  "placed", "confirmed", "shipped", "out_for_delivery", "delivered",
  "cancelled", "return_requested", "return_approved", "pickup_scheduled",
  "return_rejected", "returned", "refund_pending", "refund_processed",
];

export const updateItemStatusService = async (itemId, newStatus, reason = null, comment = null) => {
  if (!VALID_ITEM_STATUSES.includes(newStatus)) {
    throw new AppError(`Invalid item status: ${newStatus}`, 400);
  }

  const item = await orderItem.findById(itemId);
  if (!item) throw new AppError("Order item not found", 404);

  const prevStatus = item.itemStatus;
  item.itemStatus  = newStatus;

  // Store cancel reason if provided
  if (newStatus === "cancelled" && reason) {
    item.cancel = {
      ...(item.cancel || {}),
      reason,
      comments:    comment || "",
      cancelledAt: new Date(),
      requestedAt: new Date(),
    };
  }

  await item.save();

  // Restore stock when cancelling (only if not already cancelled)
  if (newStatus === "cancelled" && prevStatus !== "cancelled") {
    await Products.updateOne(
      { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
      { $inc: { "variants.$.stock": item.quantity } },
    );
  }

  return item;
};
