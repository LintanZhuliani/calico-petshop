const http = require("http");

const data = JSON.stringify({
  items: [{ productId: "p_test", productName: "Test", qty: 1, price: 1000 }],
  paid: 0,
  change: 0,
  paymentMethod: "Belum Bayar",
  branchId: "branch1",
  status: "PENDING",
  customerName: "John Doe",
  orderType: "Pickup",
  pickupDate: null
});

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "Cookie": "" // no auth
    },
  },
  (res) => {
    let responseBody = "";
    res.on("data", (chunk) => (responseBody += chunk));
    res.on("end", () => {
      console.log(res.statusCode);
      console.log(responseBody);
    });
  }
);

req.on("error", (e) => console.error(e));
req.write(data);
req.end();
