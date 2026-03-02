import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    return res.redirect('/'); // no token → just continue
  }

  return next(); // always continue
};

export default authMiddleware; 