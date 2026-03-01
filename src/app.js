import express from "express";
import authRouter from "./routes/user/auth.route.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user/user.route.js";
import cookieParser from "cookie-parser";
import attachUser from "./middlewares/attachUser.middleware.js";

const app = express();

// Attach cookie parser and user attachment middleware
app.use(cookieParser());
app.use(attachUser);

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
app.use("/", userRouter);

// -------------------
// 404 Handler
// -------------------
app.use((req, res) => {
  res.status(404).render("404");
});

// -------------------
// Global Error Handler
// -------------------
app.use(errorMiddleware);

export default app;
