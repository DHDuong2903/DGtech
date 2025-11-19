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
import cartRoute from "./routes/cartRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api/users", express.json(), userRoute);
app.use("/api/webhooks", webhookRoute);
app.use("/api/categories", express.json(), categoryRoute);
app.use("/api/products", productRoute);
app.use("/api/reviews", express.json(), reviewRoute);
app.use("/api/carts", express.json(), cartRoute);

const startServer = async () => {
  await connectDB();
  await syncModels();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
