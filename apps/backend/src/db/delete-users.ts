import "dotenv/config";
import { db } from "./index.js";
import { user } from "./schema/index.js";
import { eq, inArray } from "drizzle-orm";

async function run() {
  const emailsToDelete = [
    "test9@test.com",
    "reflianimarsela86@gmail.com"
  ];

  console.log(`Deleting users: ${emailsToDelete.join(", ")}...`);

  const result = await db.delete(user).where(inArray(user.email, emailsToDelete));

  console.log("Deleted successfully!");
  process.exit(0);
}

run().catch(console.error);
