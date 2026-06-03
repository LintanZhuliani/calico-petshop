// ===================================================
// BRANCH SERVICE — CRUD operations for branches
// ===================================================

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { branch } from "../db/schema/index.js";
import { generateId } from "../lib/utils.js";

export const branchService = {
  /** List all branches */
  async getAll() {
    return db.select().from(branch);
  },

  /** Get a single branch by ID */
  async getById(id: string) {
    const results = await db.select().from(branch).where(eq(branch.id, id));
    return results[0] || null;
  },

  /** Create a new branch */
  async create(data: { id?: string; name: string }) {
    const id = data.id || generateId("br");
    const results = await db
      .insert(branch)
      .values({ id, name: data.name })
      .returning();
    return results[0];
  },

  /** Update a branch */
  async update(id: string, data: { name: string }) {
    const results = await db
      .update(branch)
      .set({ name: data.name })
      .where(eq(branch.id, id))
      .returning();
    return results[0] || null;
  },

  /** Delete a branch */
  async delete(id: string) {
    const results = await db
      .delete(branch)
      .where(eq(branch.id, id))
      .returning();
    return results[0] || null;
  },
};
