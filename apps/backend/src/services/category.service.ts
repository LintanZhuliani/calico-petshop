import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { category, product } from "../db/schema/index.js";
import { generateId } from "../lib/utils.js";
import { getIo } from "../lib/socket.js";

export const categoryService = {
  async getAll() {
    return db.select().from(category).orderBy(category.name);
  },

  async create(name: string) {
    const [newCat] = await db
      .insert(category)
      .values({
        id: generateId("cat"),
        name: name.trim(),
      })
      .returning();
    getIo()?.emit("DATA_UPDATED");
    return newCat;
  },

  async update(id: string, newName: string) {
    return await db.transaction(async (tx) => {
      // Get old name
      const [oldCat] = await tx
        .select()
        .from(category)
        .where(eq(category.id, id));
      if (!oldCat) throw new Error("Category not found");

      // Update category table
      const [updatedCat] = await tx
        .update(category)
        .set({ name: newName.trim(), updatedAt: new Date() })
        .where(eq(category.id, id))
        .returning();

      // Update all products that had the old name
      await tx
        .update(product)
        .set({ category: newName.trim() })
        .where(eq(product.category, oldCat.name));

      getIo()?.emit("DATA_UPDATED");
      return updatedCat;
    });
  },

  async delete(id: string) {
    return await db.transaction(async (tx) => {
      // Get old name
      const [oldCat] = await tx
        .select()
        .from(category)
        .where(eq(category.id, id));
      if (!oldCat) return null;

      // Update all products that had this category to 'Lainnya'
      await tx
        .update(product)
        .set({ category: "Lainnya" })
        .where(eq(product.category, oldCat.name));

      // Delete the category
      const [deletedCat] = await tx
        .delete(category)
        .where(eq(category.id, id))
        .returning();

      getIo()?.emit("DATA_UPDATED");
      return deletedCat;
    });
  },
};
