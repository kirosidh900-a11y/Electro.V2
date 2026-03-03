import jwt from "jsonwebtoken";

const generateJWT = (user, rememberMe = false) => {
  const expiry = rememberMe ? "1d" : "1h";

  return jwt.sign(
    {
      id: user._id,
      role: user.isAdmin ? "admin" : "user",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: expiry,
    },
  );
};

export default generateJWT;
