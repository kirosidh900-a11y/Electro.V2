// ⚠️  dotenv MUST be the very first import.
// In ES modules all `import` statements are hoisted and execute before the
// module body, so calling dotenv.config() here would be TOO LATE — env vars
// would still be undefined when razorpay.config.js / db.js etc. are first
// evaluated. We load dotenv through a side-effect import instead.
import "./config/env.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

async function connectServer() {
  await connectDB();

  // create HTTP server
  const server = http.createServer(app);

  // attach socket.io
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // make global
  global.io = io;

  // connection listener
  io.on("connection", (socket) => {
    console.warn("User connected stocket:", socket.id);
  });

  // start server
  server.listen(PORT, '0.0.0.0', () => {
    console.warn(`Server is running on http://localhost:${PORT}`);
  });
}

connectServer();
