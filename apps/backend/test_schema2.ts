import { neon } from '@neondatabase/serverless';
async function main() {
  try {
    const sql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
    const cols = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log(cols.map(c => c.table_name));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
