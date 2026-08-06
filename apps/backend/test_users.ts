import { neon } from '@neondatabase/serverless';

const newSql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const users = await newSql`SELECT * FROM "user"`;
    console.log("Users in new DB:", users.length);
  } catch (err) {
    console.error("Error fetching users:", err);
  }
  process.exit(0);
}

main();
