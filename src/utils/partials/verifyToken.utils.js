import jwt from "jsonwebtoken";
import User from "../../models/userSchema.model.js";

const verifyUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return await User.findById(decoded.id).select("-password -googleId -__v").lean();
};

export default verifyUser;
