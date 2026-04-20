import Order from "../../models/orderSchema.model.js";
import orderItem from "../../models/orderItemSchema.model.js";

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

// ── Core report aggregation ───────────────────────────────────────────────────
export const getSalesReportService = async ({ preset, from, to, page = 1, limit = 20 }) => {
  const dateFilter = buildDateRange(preset, from, to);
  const skip = (page - 1) * limit;

  const matchStage = {
    orderStatus: { $nin: ["cancelled", "pending_payment", "pending"] },
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  };

  // ── Summary aggregation ───────────────────────────────────────────────────
  const [summary] = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:              null,
        totalOrders:      { $sum: 1 },
        totalRevenue:     { $sum: "$pricing.finalAmount" },
        totalDiscount:    { $sum: { $add: ["$pricing.productDiscount", "$pricing.couponDiscount"] } },
        totalCoupon:      { $sum: "$pricing.couponDiscount" },
        totalProductDisc: { $sum: "$pricing.productDiscount" },
        totalGST:         { $sum: "$pricing.gstTotal" },
        totalDelivery:    { $sum: "$pricing.deliveryCharge" },
        avgOrderValue:    { $avg: "$pricing.finalAmount" },
      },
    },
  ]);

  // ── Daily breakdown for chart ─────────────────────────────────────────────
  const dailyBreakdown = await Order.aggregate([
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

  // ── Paginated order list ──────────────────────────────────────────────────
  const totalOrders = await Order.countDocuments(matchStage);

  const orders = await Order.find(matchStage)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "name email")
    .lean();

  return {
    summary: summary || {
      totalOrders: 0, totalRevenue: 0, totalDiscount: 0,
      totalCoupon: 0, totalProductDisc: 0, totalGST: 0,
      totalDelivery: 0, avgOrderValue: 0,
    },
    dailyBreakdown,
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
  };
};

// ── Full data for exports (no pagination) ─────────────────────────────────────
export const getSalesReportAllService = async ({ preset, from, to }) => {
  const dateFilter = buildDateRange(preset, from, to);

  const matchStage = {
    orderStatus: { $nin: ["cancelled", "pending_payment", "pending"] },
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  };

  const orders = await Order.find(matchStage)
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();

  return orders;
};
