import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(); // public access allowed
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    res.redirect("/"); // ✅ continue normally
  } catch (error) {
    return res.clearCookie("token").redirect("/login");
  }
};

export default authMiddleware;