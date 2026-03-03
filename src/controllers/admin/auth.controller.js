import User from "../../models/userSchema.model.js";
import generateJWT from "../../utils/partials/jwt.utils.js";
import { setAuthCookie } from "../../utils/partials/setAuthCookie.js";
import {
  isValidEmail,
  isValidPassword,
} from "../../utils/partials/validation.utils.js";
import { checkIfAdmin, checkIfBlocked } from "../../utils/user/auth.utils.js";
import { verifyPassword } from "../../utils/partials/hashHelper.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";
import clearAuthCookie from "../../utils/partials/clearCookie.js";

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
    const { email, password } = req.body;

    isValidEmail(email);
    isValidPassword(password);

    // Find Admin User
    const admin = await User.findOne({ email });

    // If blocked
    checkIfBlocked(admin);

    // If not found or not admin
    checkIfAdmin(admin);

    if (!admin.password && admin.googleId) {
      return res.status(400).json({
        success: false,
        type: "GOOGLE_ACCOUNT",
        message: "This admin account is registered with Google.",
      });
    }

    // Verify Password
    const isMatch = await verifyPassword(admin?.password, password);

    if (!isMatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate Token
    const token = generateJWT(admin, "1h");

    // Set Cookie
    setAuthCookie(res, token ,'admin');

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      redirectUrl: "/admin/dashboard",
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
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
