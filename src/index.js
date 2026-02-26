import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function boostrap() {
  //connect to database
  await connectDB();
  //start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

boostrap();
