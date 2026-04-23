import Order from "../../models/orderSchema.model.js";

// ── Date range builder ────────────────────────────────────────────────────────
export const buildDateRange = (preset, from, to) => {
  const now   = new Date();
  const start = new Date();

  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { $gte: start, $lte: now };

    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const yEnd = new Date(y);
      yEnd.setHours(23, 59, 59, 999);
      return { $gte: y, $lte: yEnd };
    }

    case "weekly":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { $gte: start, $lte: now };

    case "monthly":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { $gte: start, $lte: now };

    case "yearly":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { $gte: start, $lte: now };

    case "custom":
      if (!from || !to) return {};
      return {
        $gte: new Date(from + "T00:00:00.000Z"),
        $lte: new Date(to   + "T23:59:59.999Z"),
      };

    default:
      return {};
  }
};

// ── Build match stage based on report type + filters ─────────────────────────
export const buildMatchStage = ({ reportType, preset, from, to, customer, payMethod, payStatus, orderStatus, minAmount, maxAmount, excludeBad }) => {
  const dateFilter = buildDateRange(preset, from, to);
  const match = {};

  // Date filter
  if (Object.keys(dateFilter).length) match.createdAt = dateFilter;

  // Report type scoping
  switch (reportType) {
    case "sales":
      match["payment.status"] = "paid";
      match.orderStatus = { $in: ["delivered", "confirmed", "shipped", "out_for_delivery", "placed"] };
      break;
    case "refunds":
      match["payment.status"] = "refunded";
      break;
    case "cancelled":
      match.orderStatus = "cancelled";
      break;
    case "orders":
    default:
      match.orderStatus = { $nin: ["pending", "pending_payment"] };
      break;
  }

  // Exclude cancelled & returned orders
  if (excludeBad) {
    // Only apply when not already scoped to cancelled/refunds tab
    if (reportType !== "cancelled" && reportType !== "refunds") {
      // Strip cancelled from orderStatus filter
      if (match.orderStatus && match.orderStatus.$nin) {
        if (!match.orderStatus.$nin.includes("cancelled")) {
          match.orderStatus.$nin.push("cancelled");
        }
      } else if (!match.orderStatus || typeof match.orderStatus === "object" && match.orderStatus.$in) {
        // Don't override $in — sales tab already scopes to non-cancelled statuses
      } else if (match.orderStatus === undefined) {
        match.orderStatus = { $nin: ["pending", "pending_payment", "cancelled"] };
      }
      // Strip refunded payments
      if (!match["payment.status"]) {
        match["payment.status"] = { $ne: "refunded" };
      }
    }
  }

  // Additional filters (override only if explicitly provided)
  if (customer)    match["userId.name"] = { $regex: customer, $options: "i" };
  if (payMethod)   match["payment.method"]  = payMethod;
  if (payStatus)   match["payment.status"]  = payStatus;
  if (orderStatus) match.orderStatus        = orderStatus;
  if (minAmount || maxAmount) {
    match["pricing.finalAmount"] = {};
    if (minAmount) match["pricing.finalAmount"].$gte = parseFloat(minAmount);
    if (maxAmount) match["pricing.finalAmount"].$lte = parseFloat(maxAmount);
  }

  return match;
};

// ── Accounting summary (always computed from full dataset, not paginated) ─────
// dateFilter = the raw $gte/$lte object from buildDateRange (NOT wrapped in createdAt)
export const buildAccountingSummary = async (dateFilter) => {
  const base = dateFilter && Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [agg] = await Order.aggregate([
    { $match: { orderStatus: { $nin: ["pending", "pending_payment"] }, ...base } },
    {
      $group: {
        _id: null,
        totalOrders:       { $sum: 1 },
        // Gross = paid orders only
        grossRevenue:      { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.finalAmount", 0] } },
        grossSubtotal:     { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.subtotal", 0] } },
        // Refunds
        refundAmount:      { $sum: { $cond: [{ $eq: ["$payment.status", "refunded"] }, "$pricing.finalAmount", 0] } },
        refundOrders:      { $sum: { $cond: [{ $eq: ["$payment.status", "refunded"] }, 1, 0] } },
        // Cancelled
        cancelledValue:    { $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, "$pricing.finalAmount", 0] } },
        cancelledOrders:   { $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] } },
        // Successful (paid + delivered)
        successOrders:     { $sum: { $cond: [{ $and: [{ $eq: ["$payment.status", "paid"] }, { $eq: ["$orderStatus", "delivered"] }] }, 1, 0] } },
        // Discounts (paid only)
        totalProductDisc:  { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.productDiscount", 0] } },
        totalCouponDisc:   { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.couponDiscount", 0] } },
        totalGST:          { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.gstTotal", 0] } },
        totalDelivery:     { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.deliveryCharge", 0] } },
        avgOrderValue:     { $avg: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.finalAmount", null] } },
      },
    },
  ]);

  const s = agg || {};
  return {
    totalOrders:      s.totalOrders      || 0,
    grossRevenue:     s.grossRevenue     || 0,
    refundAmount:     s.refundAmount     || 0,
    netRevenue:       (s.grossRevenue || 0) - (s.refundAmount || 0),
    refundOrders:     s.refundOrders     || 0,
    cancelledValue:   s.cancelledValue   || 0,
    cancelledOrders:  s.cancelledOrders  || 0,
    successOrders:    s.successOrders    || 0,
    totalProductDisc: s.totalProductDisc || 0,
    totalCouponDisc:  s.totalCouponDisc  || 0,
    totalDiscount:    (s.totalProductDisc || 0) + (s.totalCouponDisc || 0),
    totalGST:         s.totalGST         || 0,
    totalDelivery:    s.totalDelivery    || 0,
    avgOrderValue:    Math.round(s.avgOrderValue || 0),
  };
};

// ── Daily breakdown for chart ─────────────────────────────────────────────────
export const buildDailyBreakdown = async (matchStage) => {
  return Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:      { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        orders:   { $sum: 1 },
        revenue:  { $sum: "$pricing.finalAmount" },
        discount: { $sum: { $add: ["$pricing.productDiscount", "$pricing.couponDiscount"] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ── Main paginated report service ─────────────────────────────────────────────
export const getReportService = async ({ reportType = "orders", preset = "monthly", from, to, page = 1, limit = 20, customer, payMethod, payStatus, orderStatus, minAmount, maxAmount, excludeBad }) => {
  const dateFilter = buildDateRange(preset, from, to);
  const skip       = (page - 1) * limit;

  const matchStage = buildMatchStage({ reportType, preset, from, to, customer, payMethod, payStatus, orderStatus, minAmount, maxAmount, excludeBad });

  // For customer filter we need to populate first — use aggregation with lookup
  let orders, totalCount;

  if (customer) {
    // Lookup userId to filter by name
    const pipeline = [
      { $match: { ...matchStage, "userId": { $exists: true } } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userInfo" } },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      { $match: { "userInfo.name": { $regex: customer, $options: "i" } } },
    ];
    const countPipeline = [...pipeline, { $count: "total" }];
    const [countResult] = await Order.aggregate(countPipeline);
    totalCount = countResult?.total || 0;

    const dataPipeline = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $addFields: { userId: { name: "$userInfo.name", email: "$userInfo.email" } } },
    ];
    orders = await Order.aggregate(dataPipeline);
  } else {
    // Remove customer filter key that doesn't exist on schema directly
    delete matchStage["userId.name"];
    totalCount = await Order.countDocuments(matchStage);
    orders = await Order.find(matchStage)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean();
  }

  const summary        = await buildAccountingSummary(dateFilter);
  const dailyBreakdown = await buildDailyBreakdown(matchStage);

  return {
    summary,
    dailyBreakdown,
    orders,
    totalCount,
    totalPages:  Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

// ── Full export (no pagination) ───────────────────────────────────────────────
export const getReportAllService = async ({ reportType = "orders", preset = "monthly", from, to, customer, payMethod, payStatus, orderStatus, minAmount, maxAmount, excludeBad }) => {
  const matchStage = buildMatchStage({ reportType, preset, from, to, customer, payMethod, payStatus, orderStatus, minAmount, maxAmount, excludeBad });
  delete matchStage["userId.name"];

  const orders = await Order.find(matchStage)
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();

  const dateFilter = buildDateRange(preset, from, to);
  const summary    = await buildAccountingSummary(dateFilter);

  return { orders, summary };
};

// ── Chart data only — used by AJAX tab switching ──────────────────────────────
export const getChartDataService = async ({ reportType = "sales", preset = "monthly", from, to, excludeBad }) => {
  const matchStage     = buildMatchStage({ reportType, preset, from, to, excludeBad });
  const dateFilter     = buildDateRange(preset, from, to);
  const dailyBreakdown = await buildDailyBreakdown(matchStage);
  const summary        = await buildAccountingSummary(dateFilter);

  return { dailyBreakdown, summary, reportType };
};
