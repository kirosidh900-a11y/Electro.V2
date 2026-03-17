import jwt from "jsonwebtoken";
import User from "../../models/userSchema.model.js";

const verifyUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id)
    .select("+password") // include password
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const hasPassword = !!user.password;

  delete user.password; // remove before returning

  return {
    ...user,
    hasPassword,
    provider: user.googleId ? "google" : "local",
  };
};

export default verifyUser;
