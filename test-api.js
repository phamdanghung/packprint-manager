const http = require('http');

http.get('http://localhost:3002/api/test-payments', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.logs.join('\n'));
    } catch(e) {
      console.log(data);
    }
  });
});
