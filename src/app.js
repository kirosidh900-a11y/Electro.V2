import express from "express";
import authRouter from "./routes/user/auth.route.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user/user.route.js";
import adminRouter from "./routes/admin/auth.route.js";
import cookieParser from "cookie-parser";
import attachUser from "./middlewares/attachUser.middleware.js";
import passport from "./config/passport.js";
import nocache from "nocache";

const app = express();

// Attach cookie parser and user attachment middleware
app.use(cookieParser());
app.use(attachUser);
// Prevent caching of protected pages
app.use(nocache());

// Passport
app.use(passport.initialize());


// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------
// Middlewares
// -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// -------------------
// View Engine
// -------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// -------------------
// Routes
// -------------------
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/", userRouter);

// -------------------
// 404 Handler
// -------------------
app.use((req, res) => {
  res.status(404).render("404", {
    user: req.user || null,
  });
});

// -------------------
// Global Error Handler
// -------------------
app.use(errorMiddleware);

export default app;
