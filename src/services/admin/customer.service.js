import HTTP_STATUS from "../../constant/statusCode.js";
import User from "../../models/userSchema.model.js";
import AppError from "../../utils/partials/AppError.js";

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

  console.log(customer);

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
