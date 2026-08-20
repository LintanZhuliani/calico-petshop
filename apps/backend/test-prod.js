async function run() {
  const res = await fetch("https://calico-petshop-backend.vercel.app/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://calico-petshop-frontend.vercel.app" },
    body: JSON.stringify({ email: "lintanzhuliani840@gmail.com", password: "lintan17" })
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.json());
  process.exit(0);
}
run();
