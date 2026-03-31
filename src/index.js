import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

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
    console.log("User connected:", socket.id);
  });

  // start server
  server.listen(PORT, () => {
    console.warn(`Server is running on http://localhost:${PORT}`);
  });
}

connectServer();
