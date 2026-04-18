import HTTP_STATUS from "../../constant/statusCode.js";
import User from "../../models/userSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";

export const getCustomersService = async ({ page, limit, search, status }) => {
  const query = { isAdmin: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (status === "Active") query.isBlock = false;
  if (status === "Blocked") query.isBlock = true;

  const [totalCustomers, customers] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCustomers / limit);

  return {
    customers,
    totalPages,
    currentPage: page,
  };
};

export const toggleBlockCustomerService = async (id) => {
  let customer = await User.findById(id);

  const updatedCustomer = await User.findByIdAndUpdate(
    id,
    { isBlock: !customer.isBlock },
    { returnDocument: "after" },
  );

  if (!updatedCustomer) {
    throw new AppError("Customer  is not found!", HTTP_STATUS.NOT_FOUND);
  }

  return updatedCustomer.isBlock;
};

export const getCustomerDetailService = async (id) => {
  const customer = await User.findById(id).lean();
  if (!customer) throw new AppError("Customer not found", HTTP_STATUS.NOT_FOUND);

  const Order     = (await import("../../models/orderSchema.model.js")).default;
  const OrderItem = (await import("../../models/orderItemSchema.model.js")).default;
  const Address   = (await import("../../models/addressSchema.model.js")).default;
  const { Wallet } = await import("../../models/walletSchema.model.js");

  const [orders, addresses, wallet] = await Promise.all([
    Order.find({ userId: id }).sort({ createdAt: -1 }).limit(10).lean(),
    Address.find({ userId: id }).lean(),
    Wallet.findOne({ userId: id }).lean(),
  ]);

  // Get order items for recent orders
  const orderIds = orders.map(o => o._id);
  const items    = await OrderItem.find({ orderId: { $in: orderIds } }).lean();

  const itemsByOrder = {};
  items.forEach(item => {
    const key = String(item.orderId);
    if (!itemsByOrder[key]) itemsByOrder[key] = [];
    itemsByOrder[key].push(item);
  });

  const ordersWithItems = orders.map(o => ({
    ...o,
    items: itemsByOrder[String(o._id)] || [],
  }));

  const totalSpent = orders
    .filter(o => o.payment?.status === 'paid')
    .reduce((sum, o) => sum + (o.pricing?.finalAmount || 0), 0);

  return {
    customer,
    orders: ordersWithItems,
    addresses,
    walletBalance: wallet?.balance ?? 0,
    totalOrders: orders.length,
    totalSpent,
  };
};
