import HTTP_STATUS from "../../constant/statusCode.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";
import { adminLoginService } from "../../services/admin/auth.service.js";

// Show Login Page
export const showLoginPage = (req, res) => {
  res.render("admin/auth/login");
};

// Show Forgot Password Page
export const showForgotPage = (req, res) => {
  res.render("admin/auth/forgot");
};

// Admin Login Controller
export const Login = async (req, res, next) => {
  try {
    await adminLoginService(req.body, res);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Admin login successful",
      redirectUrl: "/admin/dashboard",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res, "adminToken");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};
