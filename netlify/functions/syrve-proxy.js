const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      headers: { 'Accept': 'application/json' },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      let phpsessid = null;
      for (const c of cookies) {
        const m = c.match(/PHPSESSID=([^;]+)/);
        if (m) phpsessid = m[1];
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data, phpsessid, status: res.statusCode }));
    });
    req.on('error', reject);
  });
}

function httpsGetWithCookie(url, cookie) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      headers: { 'Accept': 'application/json', 'Cookie': cookie },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data, status: res.statusCode }));
    });
    req.on('error', reject);
  });
}

exports.handler = async (event) => {
  const { action, key, storeId, syrveUrl } = JSON.parse(event.body || '{}');
  const base = (syrveUrl || 'https://terassa-chain.syrve.app').replace(/\/+$/, '');

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'key required' }) };
  }

  try {
    // Крок 1: авторизація
    const authRes = await httpsGet(`${base}/api/auth?key=${encodeURIComponent(key)}`);
    const authJson = JSON.parse(authRes.data);

    if (!authJson.authorized) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Auth failed', details: authJson }),
      };
    }

    if (action === 'auth') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorized: true, storeId: authJson.storeId }),
      };
    }

    if (action === 'balance') {
      const sid = storeId || authJson.storeId;
      const cookie = `PHPSESSID=${authRes.phpsessid}`;
      const balRes = await httpsGetWithCookie(
        `${base}/api/lite-stock/store-balance?limit=10000&offset=0&storeId=${sid}`,
        cookie
      );
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: balRes.data,
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'unknown action' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};