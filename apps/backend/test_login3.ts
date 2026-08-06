async function main() {
  try {
    const res = await fetch("https://calico-petshop-backend.vercel.app/api/auth/sign-in/email", {
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
