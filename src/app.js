import express from "express";
import authRouter from "./controllers/user/auth.controller.js";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";


const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the view engine   
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//routes
app.use("/auth", authRouter);

export default app;
