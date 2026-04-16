// @ts-nocheck
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./libs/db.js";
import { syncModels } from "./libs/syncModels.js";

import userRoute from "./routes/userRoute.js";
import webhookRoute from "./routes/webhookRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import productRoute from "./routes/productRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import cartRoute from "./routes/cartRoute.js";
import orderRoute from "./routes/orderRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import slideshowsRoute from "./routes/slideshowsRoute.js";
import addressRoute from "./routes/addressRoute.js";
import shippingRoute from "./routes/shippingRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = ["http://localhost:3000", "https://dgtech-frontend.onrender.com"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/webhooks", webhookRoute);
app.use(express.json());

app.use("/api/users", userRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/payments", paymentRoute);
app.use("/api/slideshows", slideshowsRoute);
app.use("/api/addresses", addressRoute);
app.use("/api/shipping", shippingRoute);

// JSON errors for /api (multer/Cloudinary used to call next(err) → HTML `<pre>[object Object]</pre>`)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (!req.originalUrl?.startsWith("/api")) {
    return next(err);
  }
  console.error("API error:", err?.message || err);
  const status = Number(err.statusCode || err.status) || 500;
  const message = typeof err.message === "string" && err.message.length > 0 ? err.message : "Request failed";
  res.status(status).json({
    error: message,
    ...(err.code && { code: err.code }),
    ...(process.env.NODE_ENV !== "production" && err.stack && { stack: err.stack }),
  });
});

const startServer = async () => {
  await connectDB();
  await syncModels();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Long uploads (multipart → Cloudinary) — avoid premature socket close / ECONNRESET
  server.requestTimeout = 120_000;
  server.headersTimeout = 125_000;
  server.keepAliveTimeout = 65_000;
};

startServer();
