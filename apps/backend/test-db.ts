import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        await db.execute(sql`DROP TABLE IF EXISTS "product_request" CASCADE;`);
        await db.execute(sql`
        CREATE TABLE "product_request" (
            "id" text PRIMARY KEY NOT NULL,
            "request_type" "request_type" NOT NULL,
            "status" "request_status" DEFAULT 'pending' NOT NULL,
            "items" jsonb NOT NULL,
            "branch_id" text NOT NULL,
            "note" text,
            "requested_by_id" text NOT NULL,
            "requested_by_name" text NOT NULL,
            "resolved_by_id" text,
            "resolved_by_name" text,
            "resolved_at" timestamp,
            "created_at" timestamp DEFAULT now() NOT NULL
        );
        `);
        console.log("Migration successful");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
