import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";

// ── Emit real-time stock update after any DB stock change ─────────────────────
const emitStockUpdate = async (productId, variantId) => {
  if (!global.io) return;
  const product = await Products.findById(productId).select("variants").lean();
  const variant = product?.variants?.find(v => String(v._id) === String(variantId));
  if (variant) {
    global.io.emit("stockUpdated", {
      productId,
      variantId,
      stock: Math.max(variant.stock - (variant.reserved || 0), 0),
    });
  }
};
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

  // Get the order to check payment method
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found");

  // ORDER LEVEL UPDATE
  const orderUpdate = { orderStatus: status };
  
  if (status === "delivered") {
    orderUpdate["delivery.deliveredAt"] = new Date();
    
    // For COD orders, mark payment as paid when delivered
    if (order.payment.method === "cod" && order.payment.status === "pending") {
      orderUpdate["payment.status"] = "paid";
      orderUpdate["payment.paidAt"] = new Date();
    }
  }

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
    // only update items that are still in an active/progressable state
    const protectedStatuses = [
      "cancelled",
      "returned",
      "refund_pending",
      "refund_processed",
      "return_requested",
      "return_approved",
      "return_rejected",
      "pickup_scheduled",
    ];
    await orderItem.updateMany(
      { orderId, itemStatus: { $nin: protectedStatuses } },
      { itemStatus },
    );
  }
};

export const cancelOrderService = async (orderId, { reason, comments, refundMethod, internalNote }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.isCancelled) throw new AppError("Order already cancelled", 400);

  const payMethod  = order.payment.method;
  const payStatus  = order.payment.status;
  const paidAmount = order.pricing.finalAmount ?? 0;

  // ── Smart refund decision ─────────────────────────────────────────────────
  let refundRequired = false;
  let refundAmount   = 0;
  let refundStatus   = "not_required";
  let resolvedMethod = "none";

  if (payMethod === "cod") {
    refundStatus = "not_required";
  } else if (payStatus === "failed" || payStatus === "pending") {
    refundStatus = "not_required";
  } else if (payStatus === "refunded") {
    refundStatus = "completed"; // already done — no double refund
  } else if (payStatus === "paid") {
    refundRequired = true;
    refundAmount   = paidAmount;
    if (reason === "fraud_suspected") {
      refundStatus   = "on_hold";
      resolvedMethod = "manual";
    } else {
      refundStatus   = "pending";
      resolvedMethod = refundMethod || "wallet";
    }
  }

  // ── Cancel items + rollback stock ─────────────────────────────────────────
  const items = await orderItem.find({
    orderId,
    itemStatus: { $nin: [
      "cancelled",
      "returned",
      "refund_pending",
      "refund_processed",
      "return_requested",
      "return_approved",
      "return_rejected",
      "pickup_scheduled",
    ]},
  });

  for (const item of items) {
    await Products.updateOne(
      { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
      { $inc: { "variants.$.stock": item.quantity } },
    );
    await emitStockUpdate(item.productId, item.variantId);
    item.itemStatus = "cancelled";
    item.cancel     = { reason, comments, cancelledAt: new Date(), requestedAt: new Date() };
    await item.save();
  }

  // ── Persist order cancellation ────────────────────────────────────────────
  order.orderStatus    = "cancelled";
  order.isCancelled    = true;
  order.cancelReason   = reason;
  order.cancelComments = comments;
  order.cancelledAt    = new Date();
  order.cancelledBy    = "admin";
  order.refund = {
    required:    refundRequired,
    status:      refundStatus,
    amount:      refundAmount,
    method:      resolvedMethod,
    note:        internalNote || "",
    processedAt: null,
  };
  await order.save();

  // ── Execute wallet refund immediately ─────────────────────────────────────
  if (refundRequired && refundStatus === "pending" && resolvedMethod === "wallet") {
    const { creditWallet } = await import("../user/wallet.service.js");
    await creditWallet({
      userId:      order.userId,
      amount:      refundAmount,
      description: `Refund for cancelled order #${order.orderNumber}`,
      source:      "refund",
      orderId:     order._id,
    });
    order.refund.status      = "completed";
    order.refund.processedAt = new Date();
    order.payment.status     = "refunded";
    order.payment.refundedAt = new Date();
    await order.save();
  }

  return { order, refundRequired, refundAmount, refundStatus: order.refund.status, resolvedMethod };
};

const handleReturnStock = async (item) => {
  const stockAction = item.return?.stockAction;
  const reason      = item.return?.reason;
  const condition   = item.return?.itemCondition;

  // Determine final action if not pre-set
  const noRestockReasons     = ["defective", "missing_parts", "damaged"];
  const inspectionReasons    = ["wrong_item"];
  const restockableConditions = ["sealed_new", "opened_good"];

  let action = stockAction;
  if (!action || action === "none") {
    if (noRestockReasons.includes(reason)) {
      action = "damaged_inventory";
    } else if (inspectionReasons.includes(reason)) {
      action = "pending_inspection";
    } else if (condition && restockableConditions.includes(condition)) {
      action = "restock";
    } else {
      action = "damaged_inventory";
    }
  }

  if (action === "restock") {
    await Products.updateOne(
      { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
      { $inc: { "variants.$.stock": item.quantity } },
    );
    await emitStockUpdate(item.productId, item.variantId);
  }
  // "damaged_inventory" and "pending_inspection" — do NOT restock
  // In a full system you'd write to a DamagedInventory collection here

  // Persist resolved action back to item
  item.return.stockAction = action;
  item.markModified("return");
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
    await emitStockUpdate(item.productId, item.variantId);
  }

  return item;
};
