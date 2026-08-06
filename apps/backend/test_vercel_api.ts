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
      // Fetch dashboard data
      const dashboardRes = await fetch("https://calico-petshop-backend.vercel.app/api/dashboard?branchId=all", {
        method: "GET",
        headers: {
          "Cookie": cookies,
          "Origin": "https://calico-petshop-frontend.vercel.app"
        }
      });
      const data = await dashboardRes.json();
      console.log("Dashboard Data:", JSON.stringify(data).substring(0, 500));

      // Fetch transactions
      const txRes = await fetch("https://calico-petshop-backend.vercel.app/api/transactions", {
        method: "GET",
        headers: {
          "Cookie": cookies,
          "Origin": "https://calico-petshop-frontend.vercel.app"
        }
      });
      const txData = await txRes.json();
      console.log("Transactions:", JSON.stringify(txData).substring(0, 500));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
