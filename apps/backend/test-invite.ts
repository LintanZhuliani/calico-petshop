import { auth } from './src/auth/index.js';

async function main() {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: "test_invite_321@gmail.com",
        password: "password123",
        name: "Test",
        role: "kasir",
        branchId: "pusat"
      }
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error type:", err.constructor.name);
    console.error("Error details:", err);
  }
}
main();
