import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./libs/db.js";
import { syncModels } from "./libs/syncModels.js";
import userRoute from "./routes/userRoute.js";
import webhookRoute from "./routes/webhookRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import productRoute from "./routes/productRoute.js";
import reviewRoute from "./routes/reviewRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api/users", userRoute);
app.use("/api/webhooks", webhookRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);
app.use("/api/reviews", reviewRoute);

const startServer = async () => {
  await connectDB();
  await syncModels();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
