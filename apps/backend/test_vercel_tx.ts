async function main() {
  try {
    const res = await fetch("https://calico-petshop-backend.vercel.app/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://calico-petshop-frontend.vercel.app" },
      body: JSON.stringify({ email: "lintanzhuliani840@gmail.com", password: "lintan17" })
    });
    
    console.log("Login Status:", res.status);
    const cookies = res.headers.get("set-cookie");
    
    if (res.status === 200 && cookies) {
      // Fetch transactions
      const txRes = await fetch("https://calico-petshop-backend.vercel.app/api/transactions", {
        method: "GET",
        headers: {
          "Cookie": cookies,
          "Origin": "https://calico-petshop-frontend.vercel.app"
        }
      });
      console.log("Tx Status:", txRes.status);
      const txData = await txRes.json();
      console.log("Transactions Count:", Array.isArray(txData) ? txData.length : txData);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
