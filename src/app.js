import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import helmet from "helmet";

import authRouter from "./routes/user/auth.route.js";
import userRouter from "./routes/user/user.route.js";
import adminRouter from "./routes/admin/admin.route.js";
import wishlistRoutes from "./routes/user/wishlist.route.js";
import startPaymentExpiryJob from "./jobs/paymentExpiry.job.js";
import { globalLimiter } from "./middlewares/rateLimiter.middleware.js";

import errorMiddleware from "./middlewares/error.middleware.js";
import AppError from "./utils/partials/AppError.utils.js";
import { errorResponse } from "./utils/partials/response.util.js";
import HTTP_STATUS from "./constant/statusCode.js";
import passport from "passport";

const app = express();
startPaymentExpiryJob();

// Trust the first proxy (Nginx) — required for X-Forwarded-For to work correctly
// with express-rate-limit on hosted servers
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Static files FIRST — before any middleware touches them
// nocache is NOT applied here so browser can cache CSS/JS/images
// Static Files — long cache for assets, no-cache for HTML
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "7d",
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // JS/CSS partials used as ES modules — shorter cache so updates propagate
    if (filePath.includes('/partials/')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));
app.use("/uploads", express.static("public/uploads", { maxAge: "7d" }));

// Logging
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat));

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,   // disabled — CDN scripts (Tailwind, FA) would break
  crossOriginEmbedderPolicy: false,
}));

// Global rate limiter — applied before all routes
app.use(globalLimiter);

// ✅ nocache only for HTML pages, NOT static assets (already served above)
app.use((req, res, next) => {
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/)) {
    return next(); // static assets already handled, skip nocache
  }
  if (req.path.startsWith('/socket.io')) {
    return next(); // never interfere with socket.io transport
  }
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cookieParser());
app.use(compression());

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Authentication
app.use(passport.initialize());

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

// 404 Handler
app.use((req, res) => {
  const isAdmin = req.originalUrl.startsWith("/admin");
  const isApi   = req.originalUrl.startsWith("/api") ||
                  req.headers.accept?.includes("application/json");

  if (isApi) {
    return errorResponse(res, "Route not found", HTTP_STATUS.NOT_FOUND);
  }

  if (isAdmin) {
    return res.status(HTTP_STATUS.NOT_FOUND).render("admin/404", {
      title: "Page Not Found",
    });
  }

  return res.status(HTTP_STATUS.NOT_FOUND).render("404", { user: req.user || null });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;
