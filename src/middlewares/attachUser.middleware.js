import jwt from "jsonwebtoken";
import { getUserData } from "../services/user/user.service.js";

const attachUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user once
    req.user = await getUserData(decoded.userId);

  } catch (err) {
    req.user = null;
  }

  next();
};

export default attachUser;