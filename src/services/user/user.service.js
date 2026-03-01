import User from "../../models/userSchema.model.js";

export const getUserData = async (userId) => {
  console.log("Fetching user data for userId:", userId); // Debugging log
  const user = await User.findById(userId).select("-password -otp -__v");
  return user;
};

