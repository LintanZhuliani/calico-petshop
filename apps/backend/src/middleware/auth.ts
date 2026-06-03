// ===================================================
// AUTH MIDDLEWARE — requireAuth & requireAdmin
// ===================================================

import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/index.js";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

// Extend Express Request with user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        branchId: string | null;
        image: string | null;
      };
    }
  }
}

/**
 * Middleware: Require authenticated session.
 * Extracts session from cookie and attaches user to req.user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      res.status(401).json({ error: "Unauthorized — session not found" });
      return;
    }

    let userRole = (session.user as any).role;
    let userBranchId = (session.user as any).branchId;

    // Fallback: jika Better Auth tidak mengembalikan custom fields, ambil dari DB langsung
    if (!userRole) {
      const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
      });
      userRole = dbUser?.role || "kasir";
      userBranchId = dbUser?.branchId || null;
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: userRole,
      branchId: userBranchId,
      image: session.user.image || null,
    };

    console.log("[AUTH DEBUG] Final req.user:", req.user);

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized — invalid session" });
    return;
  }
}

/**
 * Middleware: Require admin role.
 * Must be used AFTER requireAuth.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res
      .status(403)
      .json({ error: "Forbidden — admin access required" });
    return;
  }

  next();
}
