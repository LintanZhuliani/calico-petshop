async function main() {
  try {
    const loginRes = await fetch('https://calico-petshop-backend.vercel.app/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lintanzhuliani840@gmail.com', password: 'password123' })
    });
    
    const loginText = await loginRes.text();
    console.log('LOGIN STATUS:', loginRes.status);
    console.log('LOGIN TEXT:', loginText);
    
    if (!loginRes.ok) return;
    
    const loginData = JSON.parse(loginText);
    
    const txsRes = await fetch('https://calico-petshop-backend.vercel.app/api/transactions', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const txsText = await txsRes.text();
    console.log('TXS STATUS:', txsRes.status);
    console.log('TXS TEXT:', txsText.substring(0, 200));
    
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}
main();
