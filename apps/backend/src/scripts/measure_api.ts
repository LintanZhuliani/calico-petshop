const start = Date.now();
fetch("http://localhost:3001/api/products?branchId=pusat", {
  headers: {
    // We need to bypass auth or auth might fail, but let's see what happens.
    // Actually, wait, the API requires auth. We'll get a 401 if we don't have a session.
  }
}).then(res => {
  console.log("Status:", res.status);
  console.log("Time:", Date.now() - start, "ms");
}).catch(console.error);
