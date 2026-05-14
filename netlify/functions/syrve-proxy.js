const https = require('https');

exports.handler = async (event) => {
  const { login, key } = JSON.parse(event.body || '{}');

  if (!login || !key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'login and key required' }) };
  }

  const url = `https://terassa-chain.syrve.app/api/auth?login=${encodeURIComponent(login)}&key=${encodeURIComponent(key)}`;

  return new Promise((resolve) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      let phpsessid = null;
      for (const c of cookies) {
        const m = c.match(/PHPSESSID=([^;]+)/);
        if (m) phpsessid = m[1];
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...json, phpsessid }),
          });
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
        }
      });
    }).on('error', (err) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
    });
  });
};