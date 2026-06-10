import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";

const router = Router();

import { auth } from "../auth/index.js";

// GET /api/users - Get all registered users (Admin only)
router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        createdAt: user.createdAt,
      })
      .from(user);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/invite - Register a new employee with a dynamic default password
router.post("/invite", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, branchId } = req.body;
    if (!email || !branchId) {
      res.status(400).json({ error: "Email and branchId are required" });
      return;
    }

    // Determine name from email: reflianimarsela86@gmail.com -> reflianimarsela -> Reflianimarsela
    const rawName = email.split('@')[0];
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/[0-9]/g, '');

    // Determine branch suffix
    let suffix = "KCPC01";
    if (branchId === "gempi") suffix = "KGPS01";
    else if (branchId === "baba") suffix = "KBPC01";

    // Create password: reflianiKCPC01 (using first 8 chars of name or rawName)
    const shortName = rawName.replace(/[0-9]/g, '').slice(0, 8);
    const generatedPassword = `${shortName}${suffix}`;

    // Call Better Auth's programmatic signup API
    const result = await auth.api.signUpEmail({
      body: {
        email: email.toLowerCase(),
        password: generatedPassword,
        name: name,
        role: "kasir", // Default role for invited employees
        branchId: branchId
      }
    });


    res.status(201).json({ 
      message: "User invited successfully", 
      user: result,
      generatedPassword: generatedPassword 
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Delete an employee (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (req.user?.id === userId) {
      res.status(400).json({ error: "Cannot delete your own admin account" });
      return;
    }

    // Delete sessions and accounts first due to foreign key constraints, then delete user
    const { session, account } = await import("../db/schema/index.js");
    const { eq } = await import("drizzle-orm");

    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));
    const deletedUser = await db.delete(user).where(eq(user.id, userId)).returning();

    if (deletedUser.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ message: "User deleted successfully", user: deletedUser[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
