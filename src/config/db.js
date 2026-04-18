import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,        // keep 10 connections ready — no cold-start wait
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.warn("MongoDB Connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
