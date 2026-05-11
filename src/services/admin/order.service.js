import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";
import Products from "../../models/productSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

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
  const itemCount = items.length;
  const isSingleItem = itemCount === 1;

  return {
    order,
    items,
    user: order.userId,
    itemCount,
    isSingleItem,
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

  // Get the order and count items
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found");
  
  const itemCount = await orderItem.countDocuments({ orderId });
  const isSingleItem = itemCount === 1;

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

  // ITEM STATUS HANDLING - Different logic for single vs multi-item orders
  if (isSingleItem) {
    // For single item orders: Update the item status directly to match order status
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
      // Only update items that are still in an active/progressable state
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
  }
  // For multi-item orders: Don't automatically update item statuses
  // Items should be managed individually, and order status will be calculated separately
  
  return { isSingleItem, itemCount };
};

export const cancelOrderService = async (orderId, { reason, comments, refundMethod, internalNote }) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);
  if (order.isCancelled) throw new AppError("Order already cancelled", HTTP_STATUS.BAD_REQUEST);

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

  // Razorpay orders that were never paid had stock reserved, not decremented
  const isUnpaidRazorpay = payMethod === "razorpay" && payStatus !== "paid";

  for (const item of items) {
    if (isUnpaidRazorpay) {
      // Release reserved quantity back
      await Products.updateOne(
        {
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId, reserved: { $gte: item.quantity } } },
        },
        { $inc: { "variants.$.reserved": -item.quantity } },
      );
    } else {
      // Restore stock (COD / wallet / paid Razorpay)
      await Products.updateOne(
        { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
        { $inc: { "variants.$.stock": item.quantity } },
      );
    }
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
      orderItemId:    item._id,
      orderId:        item.orderId,
      userId:         item.userId,
      reason:         "return",
      isCOD:          order.payment.method === "cod",
      keepItemStatus: true,   // item stays as "returned" — don't overwrite to refund_processed
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

// ── Auto-calculate order status based on item statuses ──────────────────────
export const calculateOrderStatusFromItems = async (orderId) => {
  const items = await orderItem.find({ orderId });
  const order = await Order.findById(orderId);
  
  if (!items.length || !order) return;

  // Don't auto-update if order is already cancelled or if it's a single item order
  const itemCount = items.length;
  if (order.orderStatus === "cancelled" || itemCount === 1) return;

  // Count items by status
  const statusCounts = items.reduce((acc, item) => {
    acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
    return acc;
  }, {});

  const totalItems = items.length;
  const deliveredCount = statusCounts.delivered || 0;
  const cancelledCount = statusCounts.cancelled || 0;
  const returnedCount = statusCounts.returned || 0;
  const activeItems = totalItems - cancelledCount - returnedCount;

  let newOrderStatus = order.orderStatus;

  // If all active items are delivered, mark order as delivered
  if (activeItems > 0 && deliveredCount === activeItems) {
    newOrderStatus = "delivered";
    
    // Update order status and delivery timestamp
    const orderUpdate = { 
      orderStatus: "delivered",
      "delivery.deliveredAt": new Date()
    };
    
    // For COD orders, mark payment as paid when all items delivered
    if (order.payment.method === "cod" && order.payment.status === "pending") {
      orderUpdate["payment.status"] = "paid";
      orderUpdate["payment.paidAt"] = new Date();
    }
    
    await Order.findByIdAndUpdate(orderId, orderUpdate);
  }
  // If all items are cancelled/returned, mark order as cancelled
  else if (activeItems === 0 && (cancelledCount > 0 || returnedCount > 0)) {
    newOrderStatus = "cancelled";
    await Order.findByIdAndUpdate(orderId, { 
      orderStatus: "cancelled",
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: "system",
      cancelReason: "all_items_cancelled_or_returned"
    });
  }
  // If any item is shipped/out_for_delivery, upgrade order status accordingly
  else if (statusCounts.out_for_delivery > 0 && order.orderStatus !== "delivered") {
    newOrderStatus = "out_for_delivery";
    await Order.findByIdAndUpdate(orderId, { orderStatus: "out_for_delivery" });
  }
  else if (statusCounts.shipped > 0 && !["out_for_delivery", "delivered"].includes(order.orderStatus)) {
    newOrderStatus = "shipped";
    await Order.findByIdAndUpdate(orderId, { orderStatus: "shipped" });
  }
  else if (statusCounts.confirmed > 0 && !["shipped", "out_for_delivery", "delivered"].includes(order.orderStatus)) {
    newOrderStatus = "confirmed";
    await Order.findByIdAndUpdate(orderId, { orderStatus: "confirmed" });
  }

  return newOrderStatus;
};

export const updateItemStatusService = async (itemId, newStatus, reason = null, comment = null) => {
  if (!VALID_ITEM_STATUSES.includes(newStatus)) {
    throw new AppError(`Invalid item status: ${newStatus}`, HTTP_STATUS.BAD_REQUEST);
  }

  const item = await orderItem.findById(itemId);
  if (!item) throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);

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
    const order = await Order.findById(item.orderId).select("payment").lean();
    const isUnpaidRazorpay =
      order?.payment?.method === "razorpay" && order?.payment?.status !== "paid";

    if (isUnpaidRazorpay) {
      await Products.updateOne(
        {
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId, reserved: { $gte: item.quantity } } },
        },
        { $inc: { "variants.$.reserved": -item.quantity } },
      );
    } else {
      await Products.updateOne(
        { _id: item.productId, variants: { $elemMatch: { _id: item.variantId } } },
        { $inc: { "variants.$.stock": item.quantity } },
      );
    }
    await emitStockUpdate(item.productId, item.variantId);
  }

  // Auto-calculate order status for multi-item orders
  await calculateOrderStatusFromItems(item.orderId);

  return item;
};

// ── Admin: manually trigger a refund for a single item ───────────────────────
export const processItemRefundAdminService = async ({ itemId, orderId }) => {
  const OrderItem = (await import("../../models/orderItemSchema.model.js")).default;
  const Order     = (await import("../../models/orderSchema.model.js")).default;
  const { processItemRefund } = await import("../product/refund.service.js");

  const item  = await OrderItem.findById(itemId);
  const order = await Order.findById(orderId);

  if (!item || !order) throw new AppError("Item or order not found", HTTP_STATUS.NOT_FOUND);
  if (item.refund?.status === "processed") throw new AppError("Already refunded", HTTP_STATUS.BAD_REQUEST);

  return processItemRefund({
    orderItemId: itemId,
    orderId,
    userId:  order.userId,
    reason:  "admin_manual",
    isCOD:   order.payment.method === "cod",
  });
};

// ── Admin: get all return requests ───────────────────────────────────────────
export const getReturnRequestsService = async ({ page = 1, limit = 10, status = "" }) => {
  const skip = (page - 1) * limit;

  const returnStatuses = [
    "return_requested",
    "return_approved",
    "pickup_scheduled",
    "return_rejected",
    "returned",
    "refund_processed",   // items that completed return + refund
  ];

  const query = status === "returned"
    ? { itemStatus: { $in: ["returned", "refund_processed"] } }
    : { itemStatus: status ? status : { $in: returnStatuses } };

  // Fetch items + total + per-status counts in parallel
  const [items, total, statusCounts] = await Promise.all([
    orderItem
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    orderItem.countDocuments(query),
    orderItem.aggregate([
      { $match: { itemStatus: { $in: returnStatuses } } },
      { $group: { _id: "$itemStatus", count: { $sum: 1 } } },
    ]),
  ]);

  // Build counts map  { return_requested: 3, return_approved: 1, ... }
  const counts = returnStatuses.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  statusCounts.forEach(({ _id, count }) => { counts[_id] = count; });
  counts.total = returnStatuses.reduce((sum, s) => sum + counts[s], 0);

  // Populate order + user info
  const populated = await Promise.all(
    items.map(async (item) => {
      const order = await Order.findById(item.orderId)
        .populate("userId", "name email")
        .select("orderNumber userId payment createdAt")
        .lean();
      return { ...item, order };
    })
  );

  return {
    items: populated,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    counts,
  };
};
