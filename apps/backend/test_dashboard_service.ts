import { dashboardService } from './src/services/dashboard.service.js';
async function main() {
  try {
    const res = await dashboardService.getSummary({});
    console.log(res);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
main();
