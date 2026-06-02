async function testUI() {
  try {
    // 1. Login to get cookie
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin_test_2@test.com',
        password: '123'
      })
    });
    
    console.log("Login status:", loginRes.status);
    const cookies = loginRes.headers.get('set-cookie');
    console.log("Cookies:", cookies);
    
    // 2. Fetch page with cookie
    const pageRes = await fetch('http://localhost:3000/dashboard/delivery', {
      headers: {
        Cookie: cookies || ''
      }
    });
    
    const html = await pageRes.text();
    if (html.includes('Không tìm thấy đơn giao hàng')) {
      console.log("UI still shows empty state!");
    } else if (html.includes('GH-TEST') || html.includes('GH-2026')) {
      console.log("UI shows the jobs successfully!");
    } else {
      console.log("UI shows something else. Length of HTML:", html.length);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testUI();
