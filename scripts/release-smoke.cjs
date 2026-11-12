// Read-only public deployment checks. No payment API, authenticated account or deletion call.
// Run: node scripts/release-smoke.cjs [--require-ready]
const assert = require('node:assert/strict');
const backend = 'https://gomqzwxyzxyccxodgomq.backend.onspace.ai';
const base = `${backend}/functions/v1`;
const privatePattern = /sk_(?:live|test|[A-Za-z0-9]{12})|sb_secret_|postgres(?:ql)?:\/\/|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;
const anonKey = process.env.ORCHARD_PUBLIC_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
async function request(url, body) {
  const headers = { Accept: body ? 'application/json' : 'text/html' };
  if (anonKey) headers.apikey = anonKey;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  assert.ok(text.length <= 100000, 'Unexpectedly large public response');
  assert.ok(!privatePattern.test(text), 'Public response contains a private-credential pattern');
  return { response, text };
}
async function main() {
  let failures = 0;
  async function check(label, run) {
    try { await run(); console.log(`PASS: ${label}`); }
    catch { failures++; console.error(`BLOCKED: ${label}. Verify deployment, public operator settings and gateway configuration.`); }
  }
  await check('public weekly availability', async () => {
    const { response, text } = await request(`${base}/app-weekly-meals`, { action: 'availability' });
    assert.equal(response.status, 200);
    const data = JSON.parse(text);
    assert.deepEqual(Object.keys(data).sort(), ['information', 'message', 'ready', 'title', 'weekOf'].sort());
    assert.equal(typeof data.ready, 'boolean'); assert.equal(typeof data.message, 'string');
    if (data.ready || process.argv.includes('--require-ready')) {
      assert.equal(data.ready, true); assert.ok(data.information);
      assert.equal(typeof data.information.legalName, 'string');
    }
  });
  await Promise.all(['privacy', 'terms', 'support', 'delete-account'].map(route => check(`public ${route} page`, async () => {
    const { response, text } = await request(`${base}/app-public-information/${route}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/i);
    assert.match(text, /Orchard Shift/);
    assert.match(text, /Operator and contact/);
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    if (route === 'delete-account') { assert.match(text, /method="post"/i); assert.match(text, /name="password"/); }
  })));
  await check('anonymous paid recipes are rejected', async () => {
    const { response } = await request(`${base}/app-weekly-meals`, { action: 'read', platform: 'ios' });
    assert.equal(response.status, 401);
  });
  await check('public callers cannot supply a meal account identity', async () => {
    const { response } = await request(`${base}/app-weekly-meals`, { action: 'availability', user_id: 'fixture-other-account' });
    assert.equal(response.status, 400);
  });
  if (failures) { console.error(`${failures} deployment checks blocked. Do not approve production yet.`); process.exitCode = 1; }
  else console.log('Public deployment checks passed. Store transactions, account deletion and human review still require separate evidence.');
}
main().catch(() => { console.error('Deployment checks could not finish. Do not approve production yet.'); process.exitCode = 1; });
