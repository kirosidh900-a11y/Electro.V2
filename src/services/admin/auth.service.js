import User from "../../models/userSchema.model.js";
import { validateAdminLogin } from "../../validations/auth.validation.js";
import { verifyPassword } from "../../utils/partials/auth/password.utils.js";
import setAuthCookie from "../../utils/partials/setAuthCookie.js";
import generateJWT from "../../utils/partials/jwt.utils.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const adminLoginService = async (data, res) => {
  const { email, password } = data;

  // validation
  validateAdminLogin(data);

  const admin = await User.findOne({ email }).lean();

  if (!admin || !admin.isAdmin) {
    throw new AppError("Invalid credentials", HTTP_STATUS.BAD_REQUEST);
  }

  if (admin.isBlock) {
    throw new AppError("Admin is blocked", HTTP_STATUS.FORBIDDEN);
  }

  const isMatch = await verifyPassword(password, admin.password);

  if (!isMatch) {
    throw new AppError("Invalid credentials", HTTP_STATUS.UNAUTHORIZED);
  }

  const token = generateJWT(admin, true);

  setAuthCookie(res, token, "admin");

  return admin;
};
