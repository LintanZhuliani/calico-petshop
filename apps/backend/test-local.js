import "dotenv/config";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./src/auth/index.js";

const app = express();
app.use(express.json());

app.use("/api/auth", toNodeHandler(auth));

app.listen(3002, async () => {
  console.log("Server listening on 3002");
  
  const res = await fetch("http://localhost:3002/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
    body: JSON.stringify({ email: "lintanzhuliani840@gmail.com", password: "lintan17" })
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.json());
  process.exit(0);
});
