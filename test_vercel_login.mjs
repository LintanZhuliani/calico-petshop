async function main() {
  const email = 'lintanzhuliani840@gmail.com';
  const password = 'calicopetshop'; // Just trying a default password
  
  try {
    const res = await fetch('https://calico-petshop-backend.vercel.app/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://calico-petshop-frontend.vercel.app'
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Login status:', res.status);
    const data = await res.json().catch(()=>null);
    console.log('Login data:', data);
    
    // Also let's check Neon connection directly
  } catch (e) {
    console.error(e);
  }
}
main();
