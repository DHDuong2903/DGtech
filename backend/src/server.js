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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? true // Allow same origin in production
        : "http://localhost:3000", // Allow localhost in development
    credentials: true,
  })
);

// Webhook routes phai dung truoc express.json() vi webhook can dung express.raw()
app.use("/api/webhooks", webhookRoute);

app.use(express.json());
app.use("/api/users", userRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/payments", paymentRoute);

// Serve static files from Next.js build (production only)
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../frontend/.next/standalone");
  const publicPath = path.join(__dirname, "../../frontend/public");
  const staticPath = path.join(__dirname, "../../frontend/.next/static");

  // Serve static files
  app.use("/_next/static", express.static(staticPath));
  app.use(express.static(publicPath));

  // Serve Next.js pages - use middleware instead of route for catch-all
  app.use(async (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }

    try {
      // Import and use Next.js standalone server
      const nextServerPath = path.join(frontendPath, "frontend/server.js");
      const nextHandler = await import(nextServerPath);
      nextHandler.default(req, res);
    } catch (error) {
      console.error("Error serving Next.js:", error);
      next(error);
    }
  });
}

const startServer = async () => {
  await connectDB();
  await syncModels();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
