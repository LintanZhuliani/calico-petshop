// ===================================================
// EXPRESS APP — Calico's Pet Care Backend
// Port 3001 with CORS for Vite frontend (port 5173)
// ===================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createServer } from "http";
import { initSocket } from "./lib/socket.js";
import { initCronJobs } from "./cron/expiryAlerts.js";

// Initialize Background Cron Jobs
initCronJobs();

// Routes
import branchRoutes from "./routes/branch.routes.js";
import productRoutes from "./routes/product.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { reportRoutes } from "./routes/report.routes.js";
import userRoutes from "./routes/user.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ── WebSocket ──
if (!process.env.VERCEL) {
  initSocket(httpServer, process.env.FRONTEND_URL || "http://localhost:5173");
}

// ── CORS ──
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Allow cookies for Better Auth sessions
  })
);

// ── Better Auth Handler ──
// IMPORTANT: Mount BEFORE express.json() to avoid body parser conflicts
app.use((req, res, next) => {
  if (req.url.startsWith("/api/auth")) {
    return toNodeHandler(auth)(req, res);
  }
  next();
});

// ── Body Parser ──
app.use(express.json({ limit: "5mb" })); // 5mb for base64 product images

// ── API Routes ──
app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Calico's Pet Care API",
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   🐾 Calico's Pet Care API Server       ║
    ║   Running on http://localhost:${PORT}       ║
    ║   CORS: ${process.env.FRONTEND_URL || "http://localhost:5173"}     ║
    ╚══════════════════════════════════════════╝
    `);
  });
}

export default app;
