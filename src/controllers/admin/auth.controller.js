import HTTP_STATUS from "../../constant/statusCode.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";
import { adminLoginService } from "../../services/admin/auth.service.js";
import { successResponse } from "../../utils/partials/response.util.js";

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

    const message = "Admin login successful";

    return successResponse(res, message, HTTP_STATUS.OK, {
      redirectUrl: "/admin/dashboard",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res, "adminToken");
    const message = "Logged out successfully";
    return successResponse(res, message, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};
