// static/js/pkce-login.js
// PKCE login helper for VintelFX BinaryTool
// Usage: include this script in your index.html and call startLogin() when user clicks Login

const DERIV_APP_ID = '3465uQGg7ef1tmxfOsgSe';
const REDIRECT_URI = 'https://www.vintelfx.site/auth/callback'; // MUST match the registered redirect URI exactly
const SCOPE = 'read_balance'; // adjust if Deriv requires other scopes

function base64urlencode(buf) {
  const str = String.fromCharCode.apply(null, new Uint8Array(buf));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function sha256plain(s) { return await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); }

async function startLogin() {
  // generate code_verifier (high-entropy random string)
  const arr = new Uint8Array(64);
  crypto.getRandomValues(arr);
  const code_verifier = Array.from(arr).map(b => ('0' + b.toString(16)).slice(-2)).join('');
  localStorage.setItem('pkce_code_verifier', code_verifier);

  const digest = await sha256plain(code_verifier);
  const code_challenge = base64urlencode(digest);

  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('pkce_state', state);

  const authUrl = new URL('https://oauth.deriv.com/oauth2/authorize');
  authUrl.searchParams.set('response_type','code');
  authUrl.searchParams.set('client_id', DERIV_APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', code_challenge);
  authUrl.searchParams.set('code_challenge_method','S256');

  window.location.href = authUrl.toString();
}

window.startLogin = startLogin;
