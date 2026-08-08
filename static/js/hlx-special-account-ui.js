(0function () {
  var injectedNode = null;
  var observer = null;

  function parseStorageJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeLoginId(value) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value.toString === 'function') return String(value).trim();
    return '';
  }

  function isLinkedDemoMode() {
    return localStorage.getItem('special-account-link-mode') === 'linked' &&
      normalizeLoginId(localStorage.getItem('special-account-real-loginid')) &&
      normalizeLoginId(localStorage.getItem('special-account-demo-loginid'));
  }

  function getLinkedDemoState() {
    try {
      var realLoginId = normalizeLoginId(localStorage.getItem('special-account-real-loginid'));
      var demoBalance = Number(localStorage.getItem('special-account-demo-balance') || localStorage.getItem('special-account-dot-balance') || '0');
      if (!realLoginId) return null;
      return {
        loginid: realLoginId,
        dotAccountId: realLoginId,
        derivedBalance: Number.isFinite(demoBalance) ? demoBalance : 0,
        linkedBalance: Number.isFinite(demoBalance) ? demoBalance : 0,
      };
    } catch (error) {
      return null;
    }
  }

  function getSpecialState() {
    try {
      var activeLoginId = normalizeLoginId(localStorage.getItem('active_loginid'));
      var specialAccount = null;
      if (window.getSpecialAccountByLoginId) {
        specialAccount = window.getSpecialAccountByLoginId(activeLoginId);
      }

      if (!specialAccount && window.__APPDERIV_SPECIAL_ACCOUNT__) {
        specialAccount = window.__APPDERIV_SPECIAL_ACCOUNT__;
      }

      if (specialAccount && specialAccount.isSpecial) {
        var linkedBalance = Number(localStorage.getItem('special-account-demo-balance') || localStorage.getItem('special-account-dot-balance') || '0');
        var derivedBalance = Number(localStorage.getItem('special-account-balance') || linkedBalance || '0');

        if (window.getSpecialAccountDisplayBalance) {
          var allAccounts = parseStorageJson('all_accounts_balance', {});
          var accountsList = parseStorageJson('accountsList', []);
          derivedBalance = Number(window.getSpecialAccountDisplayBalance(activeLoginId, derivedBalance, 'USD', allAccounts, accountsList));
        }

        return {
          loginid: specialAccount.loginid || activeLoginId,
          dotAccountId: specialAccount.dotAccountId || '',
          derivedBalance: Number.isFinite(derivedBalance) ? derivedBalance : 0,
          linkedBalance: Number.isFinite(linkedBalance) ? linkedBalance : 0,
        };
      }

      if (isLinkedDemoMode()) {
        return getLinkedDemoState();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  function formatBalance(value) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  }

  function ensureNode() {
    if (injectedNode) return injectedNode;
    var node = document.createElement('div');
    node.className = 'hlx-special-account-ui';
    node.setAttribute('aria-live', 'polite');
    node.innerHTML = [
      '<div class="hlx-special-account-ui__pill">',
      '  <span class="hlx-special-account-ui__badge">REAL</span>',
      '  <span class="hlx-special-account-ui__label">Special account</span>',
      '  <span class="hlx-special-account-ui__balance">0.00</span>',
      '</div>'
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '.hlx-special-account-ui{position:fixed;top:18px;right:24px;z-index:2147483647;pointer-events:none;}',
      '.hlx-special-account-ui__pill{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 30px rgba(0,0,0,.28);color:#f8fafc;font-size:13px;font-weight:700;min-height:44px;}',
      '.hlx-special-account-ui__badge{display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;border-radius:999px;background:#22c55e;color:#052e16;text-transform:uppercase;letter-spacing:.08em;font-size:10px;}',
      '.hlx-special-account-ui__label{opacity:.9;white-space:nowrap;}',
      '.hlx-special-account-ui__balance{font-weight:800;color:#fef3c7;white-space:nowrap;}'
    ].join('');
    document.head.appendChild(style);
    document.body.appendChild(node);
    injectedNode = node;
    return node;
  }

  function render() {
    var state = getSpecialState();
    if (!state) {
      if (injectedNode) {
        injectedNode.remove();
        injectedNode = null;
      }
      return;
    }

    var node = ensureNode();
    var login = state.loginid || 'SPECIAL';
    var balance = formatBalance(state.derivedBalance);
    node.querySelector('.hlx-special-account-ui__label').textContent = 'Special account • ' + login;
    node.querySelector('.hlx-special-account-ui__balance').textContent = '$' + balance;
  }

  function guardSpecialSwitches(event) {
    var state = getSpecialState();
    if (!state) return;

    var target = event.target;
    if (!target || !target.closest) return;

    var interactive = target.closest('button, [role="button"], [class*="account"], [class*="switcher"], [data-testid*="account"]');
    if (!interactive) return;

    var text = (interactive.textContent || '').toLowerCase();
    var aria = (interactive.getAttribute('aria-label') || '').toLowerCase();
    var isRealSwitchCandidate = /real/.test(text) || /real/.test(aria) || /demo/.test(text) || /demo/.test(aria);
    if (!isRealSwitchCandidate) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    render();
  }

  function start() {
    render();
    document.addEventListener('click', guardSpecialSwitches, true);
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    window.addEventListener('active_loginid_changed', render);
    window.addEventListener('special-account-updated', render);
    window.addEventListener('balance-updated', render);
    observer = new MutationObserver(function () {
      render();
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
