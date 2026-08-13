module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const { code, code_verifier } = req.body || {};
    console.log('[exchange] incoming body - code present:', !!code, 'code_verifier present:', !!code_verifier);
    if (!code || !code_verifier) return res.status(400).json({ error: 'Missing code or code_verifier' });

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', '3465uQGg7ef1tmxfOsgSe'); // App ID - ensure this is the app that has the registered redirect
    // Use the base domain redirect URI because the app is registered with https://www.vintelfx.site
    params.append('redirect_uri', 'https://www.vintelfx.site');
    params.append('code_verifier', code_verifier);

    console.log('[exchange] exchanging code at token endpoint with redirect_uri=https://www.vintelfx.site');

    const tokenRes = await fetch('https://oauth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenJson = await tokenRes.json();
    console.log('[exchange] token endpoint response status=', tokenRes.status, 'body=', tokenJson && (typeof tokenJson === 'object' ? JSON.stringify(Object.keys(tokenJson)) : String(tokenJson)));

    if (!tokenRes.ok) return res.status(400).json({ error: 'Token exchange failed', details: tokenJson });

    const tokenB64 = Buffer.from(JSON.stringify(tokenJson)).toString('base64');
    const maxAge = tokenJson.expires_in ? Number(tokenJson.expires_in) : 3600;
    // Set cookie for the site. If you want the cookie to be available across subdomains (www and root), set Domain=.vintelfx.site
    res.setHeader('Set-Cookie', `vintelfx_token=${tokenB64}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('exchange error', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
};
