const WebSocket = require('ws');

function parseCookies(cookieHeader) {
  const res = {};
  if (!cookieHeader) return res;
  cookieHeader.split(';').forEach((c) => {
    const parts = c.split('=');
    const key = parts.shift().trim();
    const val = decodeURIComponent(parts.join('=') || '');
    res[key] = val;
  });
  return res;
}

module.exports = async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const tokenB64 = cookies['vintelfx_token'];
    if (!tokenB64) return res.status(401).json({ error: 'not_authenticated' });

    const token = JSON.parse(Buffer.from(tokenB64, 'base64').toString('utf8'));
    const accessToken = token.access_token;
    if (!accessToken) return res.status(401).json({ error: 'no_access_token' });

    const ws = new WebSocket('wss://ws.deriv.com/websockets/v3');
    const timeoutMs = 8000;

    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        try { ws.terminate(); } catch (e) {}
        reject(new Error('timeout'));
      }, timeoutMs);

      ws.on('open', () => {
        // Authorize with access token
        ws.send(JSON.stringify({ authorize: accessToken }));
      });

      ws.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.msg_type === 'authorize' && data.authorize === 'success') {
            // Request balances
            ws.send(JSON.stringify({ balance: 1, req_id: 'req_balance' }));
            return;
          }
          if (data.msg_type === 'balance' || data.balance !== undefined) {
            clearTimeout(timer);
            ws.close();
            resolve(data);
            return;
          }
        } catch (e) {
          // ignore parse errors
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      ws.on('close', () => {
        // if closed before we resolved, timer will handle rejection
      });
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('balances error', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
};
