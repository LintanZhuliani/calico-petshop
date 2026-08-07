import { db } from "../db/index.js";
import { customer } from "../db/schema/index.js";
import { eq, ilike, or } from "drizzle-orm";
import { randomBytes } from "crypto";

export class CustomerService {
  async getAll(search?: string) {
    let conditions = undefined;
    if (search) {
      conditions = or(
        ilike(customer.name, `%${search}%`),
        ilike(customer.phone, `%${search}%`)
      );
    }
    
    const customers = await db.query.customer.findMany({
      where: conditions,
      orderBy: (c, { asc }) => [asc(c.name)],
    });
    return customers;
  }

  async create(data: { name: string; phone?: string; branchId: string }) {
    const id = `CST${Date.now()}${randomBytes(2).toString("hex").toUpperCase()}`;
    const [newCustomer] = await db
      .insert(customer)
      .values({
        id,
        branchId: data.branchId,
        name: data.name,
        phone: data.phone || null,
      })
      .returning();
    return newCustomer;
  }

  async delete(id: string) {
    await db.delete(customer).where(eq(customer.id, id));
  }
}

export const customerService = new CustomerService();
