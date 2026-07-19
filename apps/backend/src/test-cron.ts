import { checkAndSendExpiryAlerts } from "./cron/expiryAlerts.js";

async function run() {
  console.log("Triggering expiry alerts manually...");
  await checkAndSendExpiryAlerts();
  console.log("Done.");
  process.exit(0);
}

run();
