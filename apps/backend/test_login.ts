import { neon } from '@neondatabase/serverless';

const newSql = neon('postgresql://neondb_owner:npg_i3HkOTnbtG8C@ep-sweet-cell-aorz6jla-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lintanzhuliani840@gmail.com", password: "lintan" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
