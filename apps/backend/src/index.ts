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
import { db } from "./db/index.js";
import { auth } from "./auth/index.js";

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
import categoryRoutes from "./routes/category.routes.js";
import customerRoutes from "./routes/customer.routes.js";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ── WebSocket ──
if (!process.env.VERCEL) {
  initSocket(httpServer, process.env.FRONTEND_URL || "http://localhost:5173");
}

// ── CORS ──
const allowedOrigins = [
  "http://localhost:5173",
  "https://calico-petshop-frontend.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow exact matches and Vercel preview URLs
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true, // Allow cookies for Better Auth sessions
  })
);

// ── Body Parser ──
app.use(express.json({ limit: "5mb" })); // 5mb for base64 product images
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// OVERRIDE: Custom sign-in route to bypass Better Auth + Vercel bug
app.post("/api/auth/sign-in/email", async (req, res) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required", code: "INVALID_REQUEST" });
    }
    
    // Manual Drizzle query (proved to work on Vercel)
    const { eq } = await import("drizzle-orm");
    const schema = await import("./db/schema/index.js");
    const users = await db.select().from(schema.user).where(eq(schema.user.email, email.toLowerCase()));
    
    if (!users.length) {
      return res.status(401).json({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
    }
    
    const user = users[0];
    const accounts = await db.select().from(schema.account).where(eq(schema.account.userId, user.id));
    const credentialAccount = accounts.find(a => a.providerId === "credential");
    
    if (!credentialAccount) {
      return res.status(401).json({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
    }
    
    // Verify password using better-auth utils
    const { verifyPassword } = await import("@better-auth/utils/password");
    const isValid = await verifyPassword(credentialAccount.password, password);
    
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
    }
    
    // Generate session
    const crypto = await import("crypto");
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const session = {
      id: crypto.randomBytes(16).toString("hex"),
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || ""
    };
    
    await db.insert(schema.session).values(session);
    
    // Set cookie
    res.cookie("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    
    return res.json({ token: sessionToken, user: { ...user, accounts }, session });
  } catch (e) {
    console.error("[CUSTOM LOGIN ERROR]", e);
    return res.status(500).json({ message: "Internal server error", error: String(e) });
  }
});

app.use(async (req, res, next) => {
  if (req.url.startsWith("/api/auth")) {
    return toNodeHandler(auth)(req, res);
  }
  next();
});

// ── API Routes ──
// Global Cache-Control untuk mencegah isu stale data dari browser/proxy
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Calico's Pet Care API",
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handler ──
app.get("/api/debug/auth", async (req, res) => {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, "lintanzhuliani840@gmail.com"),
    with: { accounts: true }
  });
  res.json({ user });
});

app.post("/api/debug/verify", async (req, res) => {
  try {
    const { Scrypt } = await import("oslo/password");
    const scrypt = new Scrypt({ N: 16384, r: 16, p: 1, dkLen: 64 });
    const isValid = await scrypt.verify(req.body.hash, req.body.password);
    res.json({ isValid });
  } catch (e) {
    res.status(500).json({ error: String(e), stack: e.stack });
  }
});

app.get("/api/debug/internal", async (req, res) => {
  try {
    const { eq } = await import("drizzle-orm");
    const schema = await import("./db/schema/index.js");
    const user = await db.select().from(schema.user).where(eq(schema.user.email, "lintanzhuliani840@gmail.com"));
    res.json({ user, type: typeof schema.user.email });
  } catch (e) {
    res.status(500).json({ error: String(e), stack: e.stack });
  }
});
app.get("/api/debug/adapter", async (req, res) => {
  try {
    const internalAdapter = await auth.$context.then(c => c.internalAdapter);
    const user = await internalAdapter.findUserByEmail("lintanzhuliani840@gmail.com", { includeAccounts: true });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: String(e), stack: e.stack });
  }
});

app.post("/api/debug/body", (req, res) => {
  res.json({
    body: req.body,
    type: typeof req.body,
    readableEnded: req.readableEnded,
    readable: req.readable,
    destroyed: req.destroyed
  });
});

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
