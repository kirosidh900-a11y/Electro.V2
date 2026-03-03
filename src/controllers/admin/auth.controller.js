import User from "../../models/userSchema.model.js";
import  generateJWT  from "../../utils/partials/jwt.utils.js";
import argon2 from "argon2";
import { setAuthCookie } from "../../utils/admin/setAuthCookie.js";
import HTTP_STATUS from "../../constant/statusCode.js";

// 🔹 Show Login Page
export const showLoginPage = (req, res) => {
  res.render("admin/auth/login");
};

// 🔹 Show Forgot Password Page
export const showForgotPage = (req, res) => {
  res.render("admin/auth/forgot");
};

// 🔹 Admin Login Controller
export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Basic Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ✅ Find Admin User
    const admin = await User.findOne({ email });

    // ❌ If not found or not admin
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ❌ If blocked
    if (admin.isBlock) {
      return res.status(403).json({
        success: false,
        message: "Admin account is blocked ❌",
      });
    }

    if (!admin.password && admin.googleId) {
      return res.status(400).json({
        success: false,
        type: "GOOGLE_ACCOUNT",
        message: "This admin account is registered with Google.",
      });
    }

    // ✅ Verify Password
    const isMatch = await argon2.verify(admin?.password, password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Generate Token
    const token = generateJWT(admin, "1h");

    // ✅ Set Cookie
    setAuthCookie(res, token);

    // ✅ Success Response
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      redirectUrl: "/admin/dashboard",
    });
  } catch (error) {
    console.error("Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
