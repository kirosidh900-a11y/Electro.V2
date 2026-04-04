import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
// import helmet from "helmet";
import nocache from "nocache";
import morgan from "morgan";
import compression from "compression";

import authRouter from "./routes/user/auth.route.js";
import userRouter from "./routes/user/user.route.js";
import adminRouter from "./routes/admin/admin.route.js";
import wishlistRoutes from "./routes/user/wishlist.route.js";

import errorMiddleware from "./middlewares/error.middleware.js";
import AppError from "./utils/partials/AppError.utils.js";
import { errorResponse } from "./utils/partials/response.util.js";
import HTTP_STATUS from "./constant/statusCode.js";
import passport from "passport";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat));

//  Security Middlewares
// app.use(helmet());
app.use(nocache());
app.use(cookieParser());
app.use(compression());

// Body Parsers with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Authentication
app.use(passport.initialize());

// Static Files (with cache control)
app.use("/uploads", express.static("public/uploads", { maxAge: "1d" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1d" }));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/", userRouter);

//api routes
// app.use("/api/auth", authApiRouter);
// app.use("/api/products", productApiRouter);
// app.use("/api/cart", cartApiRouter);
app.use('/api/user', userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wishlist", wishlistRoutes);

// 404 Handler (FIXED)
app.use((req, res) => {
  const err = new AppError("Route not found", 404);

  if (
    req.originalUrl.startsWith("/admin") ||
    req.originalUrl.startsWith("/auth")
  ) {
    errorResponse(res, err.message, HTTP_STATUS.NOT_FOUND);
  }

  if (req.headers.accept?.includes("application/json")) {
    errorResponse(res, err.message, HTTP_STATUS.NOT_FOUND);
  }

  return res.status(404).render("404", { user: req.user || null });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;
