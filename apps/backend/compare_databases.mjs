import { neon } from '@neondatabase/serverless';
// This is the ORIGINAL database (ep-sweet-cell)
const sqlOrig = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
// This is the recovery database (ep-sweet-credit = recovery-asli)
const sqlRecov = neon('postgresql://neondb_owner:npg_CTUVj5RfZKP0@ep-sweet-credit-ao66o378-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const origCount = await sqlOrig`SELECT count(*) FROM "transaction"`;
    console.log("ORIGINAL (ep-sweet-cell) tx count:", origCount[0].count);

    const recovCount = await sqlRecov`SELECT count(*) FROM "transaction"`;
    console.log("RECOVERY (ep-sweet-credit) tx count:", recovCount[0].count);

    // Check date ranges
    const origDates = await sqlOrig`SELECT min("date"), max("date") FROM "transaction"`;
    console.log("ORIGINAL date range:", origDates[0]);

    const recovDates = await sqlRecov`SELECT min("date"), max("date") FROM "transaction"`;
    console.log("RECOVERY date range:", recovDates[0]);

    // Check Aug 2-5 in both
    const origMid = await sqlOrig`SELECT count(*) FROM "transaction" WHERE "date" >= '2026-08-02' AND "date" < '2026-08-06'`;
    console.log("ORIGINAL Aug 2-5:", origMid[0].count);

    const recovMid = await sqlRecov`SELECT count(*) FROM "transaction" WHERE "date" >= '2026-08-02' AND "date" < '2026-08-06'`;
    console.log("RECOVERY Aug 2-5:", recovMid[0].count);

  } catch(e) {
    console.error(e);
  }
}
main();
