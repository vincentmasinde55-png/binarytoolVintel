const test = require('node:test');
const assert = require('node:assert/strict');

const api = require('./special-accounts.js');

test('special account helpers expose mapping and derived balances', () => {
  const config = api.getSpecialAccountConfig('ROT91032609');
  assert.ok(config);
  assert.equal(config.dotAccountId, 'DOT92192170');
  assert.equal(api.getSpecialAccountDotAccountId('ROT91032609'), 'DOT92192170');

  const derived = api.getSpecialAccountDisplayBalance(
    'ROT91032609',
    100,
    'USD',
    {
      accounts: {
        DOT92192170: { balance: 10500 },
      },
    },
    [{ loginid: 'DOT92192170', balance: 10500 }]
  );

  assert.equal(derived, 748.37);
});
