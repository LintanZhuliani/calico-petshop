async function main() {
  try {
    const dashboardRes = await fetch("https://calico-petshop-backend.vercel.app/api/dashboard?branchId=all");
    console.log("Status:", dashboardRes.status);
    console.log("Body:", (await dashboardRes.text()).substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
main();
