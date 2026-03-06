import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
//import helmet from "helmet";
import nocache from "nocache";
import morgan from "morgan";

import authRouter from "./routes/user/auth.route.js";
import userRouter from "./routes/user/user.route.js";
import adminRouter from "./routes/admin/admin.route.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

// Use morgan middleware
app.use(morgan("dev"));

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Security Middlewares
// app.use(helmet());
app.use(nocache());
app.use(cookieParser());
app.use(passport.initialize());

// 📦 Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Static Files
app.use("/uploads", express.static("public/uploads"));
app.use(express.static(path.join(__dirname, "public")));

// 🎨 View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🚦 Routes
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/", userRouter);

// ❌ 404 Handler (Smart – API + EJS Compatible)
app.use((req, res, next) => {
  // If request is API-based
  if (
    req.originalUrl.startsWith("/admin") ||
    req.originalUrl.startsWith("/auth")
  ) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  // Otherwise render EJS 404 page
  return res.status(404).render("404", {
    user: req.user || null,
  });
});

// 🌍 Global Error Handler
app.use(errorMiddleware);

export default app;
