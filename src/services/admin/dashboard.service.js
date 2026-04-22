import Order     from "../../models/orderSchema.model.js";
import OrderItem from "../../models/orderItemSchema.model.js";
import User      from "../../models/userSchema.model.js";
import Product   from "../../models/productSchema.model.js";
import Category  from "../../models/CategorySchema.model.js";

// ── Date range helpers ────────────────────────────────────────────────────────
const startOf = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOf   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

export const buildRange = (filter) => {
  const now = new Date();
  switch (filter) {
    case "today": {
      return { $gte: startOf(now), $lte: endOf(now) };
    }
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { $gte: startOf(y), $lte: endOf(y) };
    }
    case "weekly": {
      const w = new Date(now); w.setDate(w.getDate() - 6); w.setHours(0,0,0,0);
      return { $gte: w, $lte: now };
    }
    case "monthly": {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: m, $lte: now };
    }
    case "yearly": {
      const y = new Date(now.getFullYear(), 0, 1);
      return { $gte: y, $lte: now };
    }
    default: { // "all"
      return null;
    }
  }
};

// ── Summary cards ─────────────────────────────────────────────────────────────
export const getSummaryStats = async (dateRange) => {
  const dateMatch = dateRange ? { createdAt: dateRange } : {};

  // Get order-level stats
  const [orderAgg] = await Order.aggregate([
    { $match: { orderStatus: { $nin: ["pending","pending_payment"] }, ...dateMatch } },
    {
      $group: {
        _id: null,
        totalOrders:    { $sum: 1 },
        grossRevenue:   { $sum: { $cond: [{ $eq: ["$payment.status","paid"] }, "$pricing.finalAmount", 0] } },
        deliveredCount: { $sum: { $cond: [{ $eq: ["$orderStatus","delivered"] }, 1, 0] } },
        pendingCount:   { $sum: { $cond: [{ $in:  ["$orderStatus",["placed","confirmed","shipped","out_for_delivery"]] }, 1, 0] } },
        avgOrderValue:  { $avg: { $cond: [{ $eq: ["$payment.status","paid"] }, "$pricing.finalAmount", null] } },
      },
    },
  ]);

  // Get item-level stats for accurate refund amount only
  // Cancelled count stays at ORDER level — one cancelled order = 1, regardless of item count
  const itemDateMatch = dateRange ? { createdAt: dateRange } : {};
  
  const [itemAgg] = await OrderItem.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "orderId", 
        foreignField: "_id",
        as: "order"
      }
    },
    { $unwind: "$order" },
    { $match: { "order.orderStatus": { $nin: ["pending","pending_payment"] }, ...itemDateMatch } },
    {
      $group: {
        _id: null,
        refundAmount: { 
          $sum: { 
            $cond: [
              { $eq: ["$refund.status", "processed"] }, 
              "$refund.amount", 
              0
            ] 
          } 
        }
      }
    }
  ]);

  // Count cancelled orders at ORDER level (not item level)
  // This covers: fully cancelled orders + orders where all items were individually cancelled
  const cancelledOrderCount = await Order.countDocuments({
    orderStatus: "cancelled",
    ...(dateRange ? { createdAt: dateRange } : {}),
  });

  const [totalUsers, totalProducts, totalCategories] = await Promise.all([
    User.countDocuments({ isAdmin: { $ne: true } }),
    Product.countDocuments({ isDeleted: false }),
    Category.countDocuments({}),
  ]);
  
  const s = orderAgg || {};
  const itemStats = itemAgg || {};

  return {
    totalOrders:     s.totalOrders    || 0,
    grossRevenue:    s.grossRevenue   || 0,
    netRevenue:      (s.grossRevenue  || 0) - (itemStats.refundAmount || 0),
    refundAmount:    itemStats.refundAmount   || 0,
    cancelledCount:  cancelledOrderCount,
    deliveredCount:  s.deliveredCount || 0,
    pendingCount:    s.pendingCount   || 0,
    avgOrderValue:   Math.round(s.avgOrderValue || 0),
    totalUsers,
    totalProducts,
    totalCategories,
  };
};

// ── Revenue chart data ────────────────────────────────────────────────────────
export const getRevenueChart = async (filter) => {
  const now = new Date();

  // For "yearly" → monthly buckets; otherwise → daily buckets
  const useMonthly = filter === "yearly" || filter === "all";
  const dateRange  = buildRange(filter);
  const dateMatch  = dateRange ? { createdAt: dateRange } : {};

  const fmt = useMonthly ? "%Y-%m" : "%Y-%m-%d";

  const data = await Order.aggregate([
    { $match: { "payment.status": "paid", ...dateMatch } },
    {
      $group: {
        _id:      { $dateToString: { format: fmt, date: "$createdAt" } },
        revenue:  { $sum: "$pricing.finalAmount" },
        orders:   { $sum: 1 },
        discount: { $sum: { $add: ["$pricing.productDiscount","$pricing.couponDiscount"] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing months/days with 0 so chart has no gaps
  if (useMonthly) {
    const months = [];
    const start  = dateRange ? new Date(dateRange.$gte) : new Date(now.getFullYear(), 0, 1);
    const end    = dateRange ? new Date(dateRange.$lte) : now;
    const cur    = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    const map = Object.fromEntries(data.map(d => [d._id, d]));
    return months.map(m => map[m] || { _id: m, revenue: 0, orders: 0, discount: 0 });
  }

  return data;
};

// ── Order status breakdown (for donut chart) ──────────────────────────────────
export const getOrderStatusBreakdown = async (dateRange) => {
  const dateMatch = dateRange ? { createdAt: dateRange } : {};
  
  // Count at ORDER level — one order = one unit regardless of how many items it has
  const orderBreakdown = await Order.aggregate([
    { $match: { orderStatus: { $nin: ["pending","pending_payment"] }, ...dateMatch } },
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return orderBreakdown;
};

// ── Shared: get qualifying order IDs for a date range ────────────────────────
const getQualifyingOrderIds = async (dateRange) => {
  if (!dateRange) return null; // null = no filter, match all
  const orders = await Order.find({
    createdAt:   dateRange,
    orderStatus: { $nin: ["pending","pending_payment","cancelled"] },
  }, "_id").lean();
  return orders.map(o => o._id);
};

// ── Top 10 products by revenue ────────────────────────────────────────────────
export const getTopProducts = async (dateRange) => {
  const orderIds = await getQualifyingOrderIds(dateRange);
  const itemMatch = {
    itemStatus: { $nin: ["cancelled","return_requested","return_approved","returned","refund_pending","refund_processed","pending_payment"] },
    ...(orderIds ? { orderId: { $in: orderIds } } : {}),
  };

  return OrderItem.aggregate([
    { $match: itemMatch },
    {
      $group: {
        _id:      "$productId",
        name:     { $first: "$name" },
        revenue:  { $sum: "$pricing.total" },
        quantity: { $sum: "$quantity" },
        orders:   { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         "products",
        localField:   "_id",
        foreignField: "_id",
        as:           "product",
      },
    },
    {
      $project: {
        name:     { $ifNull: ["$name", { $arrayElemAt: ["$product.name", 0] }] },
        revenue:  1,
        quantity: 1,
        orders:   1,
      },
    },
  ]);
};

// ── Top 10 categories by revenue ──────────────────────────────────────────────
export const getTopCategories = async (dateRange) => {
  const orderIds = await getQualifyingOrderIds(dateRange);
  const itemMatch = {
    itemStatus: { $nin: ["cancelled","return_requested","return_approved","returned","refund_pending","refund_processed","pending_payment"] },
    ...(orderIds ? { orderId: { $in: orderIds } } : {}),
  };

  return OrderItem.aggregate([
    { $match: itemMatch },
    {
      $lookup: {
        from:         "products",
        localField:   "productId",
        foreignField: "_id",
        as:           "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id:      "$product.category",
        revenue:  { $sum: "$pricing.total" },
        quantity: { $sum: "$quantity" },
        orders:   { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         "categories",
        localField:   "_id",
        foreignField: "_id",
        as:           "category",
      },
    },
    {
      $project: {
        name:     { $ifNull: [{ $arrayElemAt: ["$category.title", 0] }, "Unknown"] },
        revenue:  1,
        quantity: 1,
        orders:   1,
      },
    },
  ]);
};

// ── Top 10 brands by revenue ──────────────────────────────────────────────────
export const getTopBrands = async (dateRange) => {
  const orderIds = await getQualifyingOrderIds(dateRange);
  const itemMatch = {
    itemStatus: { $nin: ["cancelled","return_requested","return_approved","returned","refund_pending","refund_processed","pending_payment"] },
    ...(orderIds ? { orderId: { $in: orderIds } } : {}),
  };

  return OrderItem.aggregate([
    { $match: itemMatch },
    {
      $lookup: {
        from:         "products",
        localField:   "productId",
        foreignField: "_id",
        as:           "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id:      "$product.brand",
        revenue:  { $sum: "$pricing.total" },
        quantity: { $sum: "$quantity" },
        orders:   { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         "brands",
        localField:   "_id",
        foreignField: "_id",
        as:           "brand",
      },
    },
    {
      $project: {
        name:     { $ifNull: [{ $arrayElemAt: ["$brand.title", 0] }, "Unknown"] },
        revenue:  1,
        quantity: 1,
        orders:   1,
      },
    },
  ]);
};

// ── Recent orders (last 10) ───────────────────────────────────────────────────
export const getRecentOrders = async () => {
  return Order.find({ orderStatus: { $nin: ["pending","pending_payment"] } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("userId", "name email")
    .lean();
};

// ── Payment method breakdown ──────────────────────────────────────────────────
export const getPaymentMethodBreakdown = async (dateRange) => {
  const dateMatch = dateRange ? { createdAt: dateRange } : {};
  return Order.aggregate([
    { $match: { "payment.status": "paid", ...dateMatch } },
    {
      $group: {
        _id:     "$payment.method",
        count:   { $sum: 1 },
        revenue: { $sum: "$pricing.finalAmount" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
};

// ── Ledger book ───────────────────────────────────────────────────────────────
export const getLedgerData = async (dateRange) => {
  const dateMatch = dateRange ? { createdAt: dateRange } : {};

  const orders = await Order.find({
    "payment.status": { $in: ["paid","refunded"] },
    ...dateMatch,
  })
    .sort({ createdAt: 1 })
    .populate("userId", "name email")
    .lean();

  let runningBalance = 0;
  const entries = orders.map(o => {
    const isPaid     = o.payment?.status === "paid";
    const amount     = o.pricing?.finalAmount || 0;
    const debit      = isPaid ? 0 : amount;
    const credit     = isPaid ? amount : 0;
    runningBalance  += credit - debit;
    return {
      date:           o.createdAt,
      orderNumber:    o.orderNumber,
      customer:       o.userId?.name || "—",
      description:    isPaid ? `Sale — ${o.payment?.method?.toUpperCase()}` : "Refund Processed",
      credit,
      debit,
      balance:        runningBalance,
      type:           isPaid ? "credit" : "debit",
    };
  });

  return {
    entries,
    totalCredit:  entries.reduce((s, e) => s + e.credit, 0),
    totalDebit:   entries.reduce((s, e) => s + e.debit,  0),
    closingBalance: runningBalance,
  };
};

// ── Master dashboard loader ───────────────────────────────────────────────────
export const getDashboardData = async (filter = "monthly") => {
  const dateRange = buildRange(filter);

  const [summary, revenueChart, statusBreakdown, topProducts, topCategories, topBrands, recentOrders, paymentMethods] =
    await Promise.all([
      getSummaryStats(dateRange),
      getRevenueChart(filter),
      getOrderStatusBreakdown(dateRange),
      getTopProducts(dateRange),
      getTopCategories(dateRange),
      getTopBrands(dateRange),
      getRecentOrders(),
      getPaymentMethodBreakdown(dateRange),
    ]);

  return { summary, revenueChart, statusBreakdown, topProducts, topCategories, topBrands, recentOrders, paymentMethods, filter };
};
