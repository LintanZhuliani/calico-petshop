import { apiFetch } from "./src/lib/api.js";

async function testCheckout() {
  try {
    const res = await fetch("http://localhost:3000/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Need a valid token or bypass auth? 
        // Wait, I might not have a valid token.
      },
      body: JSON.stringify({
        items: [{ productId: "test", productName: "Test", qty: 1, price: 1000 }],
        paid: 0,
        change: 0,
        paymentMethod: "Belum Bayar",
        branchId: "branch1",
        status: "PENDING",
        customerName: "Test User",
        orderType: "Pickup",
        pickupDate: null
      })
    });
    
    console.log(res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}

testCheckout();
