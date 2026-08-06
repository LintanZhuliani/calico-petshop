async function main() {
  try {
    const res = await fetch("http://localhost:3001/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
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
