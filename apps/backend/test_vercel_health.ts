async function main() {
  try {
    const res = await fetch("https://calico-petshop-backend.vercel.app/api/health");
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error(e);
  }
}
main();
