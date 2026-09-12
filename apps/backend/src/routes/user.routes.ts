import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { user, account, session } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { Scrypt } from "oslo/password";
import { generateId } from "../lib/utils.js";

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

    // Insert directly into db to prevent Internal Server Error from auth.api
    // and to prevent logging out the admin (which signUpEmail does by setting a new cookie)
    const scrypt = new Scrypt({ N: 16384, r: 16, p: 1, dkLen: 64 });
    const hashedPassword = await scrypt.hash(generatedPassword);
    
    const newUserId = generateId().replace(/-/g, '').substring(0, 32); // Better Auth expects max 32 chars usually, but UUID without dashes is 32

    const newUserResult = await db.insert(user).values({
      id: newUserId,
      email: email.toLowerCase(),
      name: name,
      role: "kasir",
      branchId: branchId,
      emailVerified: false
    }).returning();

    await db.insert(account).values({
      id: generateId().replace(/-/g, '').substring(0, 32),
      accountId: newUserId,
      providerId: "credential",
      userId: newUserId,
      password: hashedPassword
    });

    const result = newUserResult[0];
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
    const userId = req.params.id as string;
    
    // Prevent admin from deleting themselves
    if (req.user?.id === userId) {
      res.status(400).json({ error: "Cannot delete your own admin account" });
      return;
    }

    // Reassign all records that reference this user to the admin's ID to preserve history
    // and avoid foreign key constraint violations during deletion.
    const adminId = req.user!.id;
    const { transaction } = await import("../db/schema/transaction.js");
    const { rekap } = await import("../db/schema/rekap.js");
    const { productRequest } = await import("../db/schema/request.js");
    const { transfer } = await import("../db/schema/transfer.js");

    await db.update(transaction).set({ cashierId: adminId }).where(eq(transaction.cashierId, userId));
    await db.update(rekap).set({ userId: adminId }).where(eq(rekap.userId, userId));
    await db.update(productRequest).set({ requestedById: adminId }).where(eq(productRequest.requestedById, userId));
    await db.update(productRequest).set({ resolvedById: adminId }).where(eq(productRequest.resolvedById, userId));
    await db.update(transfer).set({ initiatedById: adminId }).where(eq(transfer.initiatedById, userId));
    await db.update(transfer).set({ confirmedById: adminId }).where(eq(transfer.confirmedById, userId));

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

// PUT /api/users/profile - Update own profile (name, email)
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;
    
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    // Check if email is already taken by another user
    const { eq } = await import("drizzle-orm");
    const existing = await db.select().from(user).where(eq(user.email, email.toLowerCase()));
    if (existing.length > 0 && existing[0].id !== userId) {
      res.status(400).json({ error: "Email is already in use by another account" });
      return;
    }

    const updatedUser = await db.update(user)
      .set({ 
        name: name,
        email: email.toLowerCase(),
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))
      .returning();

    res.json({ message: "Profile updated successfully", user: updatedUser[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
