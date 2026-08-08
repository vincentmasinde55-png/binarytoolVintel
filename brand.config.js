const DEFAULT_SITES = {};

const DEFAULT = {
  id: 'default',
  name: 'AppDeriv Sites Builder',
  appName: 'AppDeriv Sites Builder',
  logoTextMain: 'AppDeriv',
  logoTextAccent: 'Sites Builder',
  tagline: 'Build your trading brand.',
  description: 'Custom branded trading website.',
  derivAppId: '',
  allowedDomains: [],
  primaryDomain: 'appderivsites12.vercel.app',
  primaryColor: '#0d0557',
  accentColor: '#0f33d6',
  activeTabColor: '#0f33d6',
  botButtonColor: '#0d0557',
  botBuilderColor: '#0b0f19',
  secondaryColor: '#0b0f19',
  backgroundColor: '#0a0713',
  fontFamily: 'Inter',
  fontGoogleParam: 'Inter:wght@300;400;500;600;700;800',
  referralUrl: '',
  specialAccounts: [],
  marketingAccounts: [],
};

const DEFAULT_SITE_KEY = 'default';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_READ_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./i, '')
    .split(',')[0]
    .trim();
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const color = raw.startsWith('#') ? raw : `#${raw}`;
  const sixDigit = /^#?([0-9a-fA-F]{6})$/.exec(color);
  if (sixDigit) return `#${sixDigit[1].toLowerCase()}`;

  const eightDigit = /^#?([0-9a-fA-F]{8})$/.exec(color);
  if (eightDigit) return `#${eightDigit[1].slice(0, 6).toLowerCase()}`;

  const short = /^#?([0-9a-fA-F]{3})$/.exec(color);
  if (short) {
    const expanded = short[1].split('').map((digit) => digit + digit).join('');
    return `#${expanded.toLowerCase()}`;
  }

  return fallback;
}

function normalizeRedirectUrl(value, fallbackDomain) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (!fallbackDomain) return '';
    return `https://${fallbackDomain}/`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

function normalizeSpecialAccounts(value) {
  const source = Array.isArray(value) ? value : [];

  return source
    .map((item) => {
      if (!item || typeof item !== 'object') {
        if (typeof item === 'string' && item.trim()) {
          return { loginid: item.trim(), dotAccountId: '', subtract: 9857.28, description: 'Special ROT account' };
        }
        return null;
      }

      const loginid = item.loginid || item.login_id || item.account_id || item.id || '';
      const dotAccountId = item.dotAccountId || item.dot_account_id || item.dotAccount || '';
      const subtract = Number(item.subtract ?? item.amount ?? 9857.28);
      const description = item.description || 'Special ROT account derived from the authorized DOT account balance';

      if (!loginid) return null;

      return {
        loginid,
        dotAccountId,
        subtract: Number.isFinite(subtract) ? subtract : 9857.28,
        description,
      };
    })
    .filter(Boolean);
}

function normalizeSiteRow(row) {
  const allowedDomains = Array.isArray(row.allowed_domains)
    ? row.allowed_domains.filter(Boolean)
    : typeof row.allowed_domains === 'string'
      ? row.allowed_domains.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  const primaryDomain = normalizeHostname(row.primary_domain || allowedDomains[0] || '');
  const normalizedAllowedDomains = [...new Set(allowedDomains.map((item) => normalizeHostname(item)).filter(Boolean))];
  const redirectUrl = normalizeRedirectUrl(row.redirect_url || row.redirectUrl || primaryDomain, primaryDomain);
  const slug = row.slug || row.id || (row.name || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: slug,
    siteId: row.id || row.site_id || row.database_id || '',
    name: row.name || row.app_name || 'Site',
    appName: row.app_name || row.name || 'Site',
    logoTextMain: row.logo_text_main || row.app_name || row.name || 'Site',
    logoTextAccent: row.logo_text_accent || 'Trading Hub',
    logoUrl: row.logo_url || row.logoUrl || '',
    faviconUrl: row.favicon_url || row.faviconUrl || '',
    tagline: row.tagline || 'smarter trading, easier grinding',
    description: row.description || 'Custom branded trading website.',
    derivAppId: row.deriv_app_id || '',
    redirectUrl,
    allowedDomains: [...new Set(normalizedAllowedDomains.concat(primaryDomain).filter(Boolean))],
    primaryDomain,
    primaryColor: normalizeHexColor(row.primary_color, '#0d0557'),
    accentColor: normalizeHexColor(row.accent_color, '#0f33d6'),
    activeTabColor: normalizeHexColor(
      row.active_tab_color || row.activeTabColor || row.accent_color || row.accentColor,
      '#0f33d6'
    ),
    botButtonColor: normalizeHexColor(
      row.bot_button_color || row.botButtonColor || row.primary_color || row.primaryColor,
      '#0d0557'
    ),
    botBuilderColor: normalizeHexColor(
      row.bot_builder_color || row.botBuilderColor || row.secondary_color || row.secondaryColor,
      '#0b0f19'
    ),
    secondaryColor: normalizeHexColor(row.secondary_color, '#0b0f19'),
    backgroundColor: normalizeHexColor(row.background_color, '#0a0713'),
    fontFamily: row.font_family || 'Inter',
    fontGoogleParam: row.font_google_param || 'Inter:wght@300;400;500;600;700;800',
    referralUrl: row.referral_url || '',
    specialAccounts: normalizeSpecialAccounts(row.special_accounts || row.specialAccounts || []),
    marketingAccounts: Array.isArray(row.marketing_accounts || row.marketingAccounts) ? (row.marketing_accounts || row.marketingAccounts) : [],
  };
}

async function fetchSitesFromDatabase() {
  if (!SUPABASE_URL || !SUPABASE_READ_KEY) return {};

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_configs?select=*&is_active=eq.true`, {
      headers: {
        apikey: SUPABASE_READ_KEY,
        Authorization: `Bearer ${SUPABASE_READ_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Supabase site fetch failed: ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return {};

    const sites = {};
    for (const row of rows) {
      const normalized = normalizeSiteRow(row);
      sites[normalized.id] = normalized;
    }
    return sites;
  } catch (error) {
    console.warn('[brand.config] No database site config available:', error instanceof Error ? error.message : error);
    return {};
  }
}

async function findSiteByHostname(hostname) {
  const sites = await fetchSitesFromDatabase();
  const defaultSite = sites[DEFAULT_SITE_KEY] || DEFAULT;

  if (!hostname) return defaultSite;

  const host = normalizeHostname(hostname);
  if (!host) return defaultSite;

  for (const siteKey of Object.keys(sites)) {
    const site = sites[siteKey];
    const primary = normalizeHostname(site.primaryDomain);
    const allowed = Array.isArray(site.allowedDomains)
      ? site.allowedDomains.map((domain) => normalizeHostname(domain))
      : [];

    if ((primary && primary === host) || allowed.includes(host)) return site;
    if (primary && primary.replace(/^www\./i, '') === host.replace(/^www\./i, '')) return site;
    if (allowed.some((domain) => domain.replace(/^www\./i, '') === host.replace(/^www\./i, ''))) return site;
  }

  return defaultSite;
}

module.exports = Object.assign({}, DEFAULT, {
  sites: DEFAULT_SITES,
  defaultSiteKey: DEFAULT_SITE_KEY,
  getConfig: async (hostname) => findSiteByHostname(hostname),
  fetchSitesFromDatabase,
});
