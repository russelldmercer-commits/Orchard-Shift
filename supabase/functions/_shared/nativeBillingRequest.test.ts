// Run offline with no --allow-* flags. No runtime adapters or remote SDK imports.
import { createNativeBillingHandlers } from './nativeBillingHandlers.ts';
import { NativeBillingError, type NativeAuthResult, type NativePlatform } from './nativeBillingValidation.ts';
import { nativeBillingFixtures as f, nativeAuthFixture, nativeConfigurationFixture, nativeStatusFixture } from './nativeBilling.fixtures.ts';
import { verifiedNativeStatus } from './nativeEntitlement.ts';

type Endpoint = 'configuration' | 'subscription';
interface HarnessOptions {
  auth?: NativeAuthResult;
  authError?: unknown;
  configuration?: (platform: NativePlatform) => unknown;
  membership?: (ownerId: string) => unknown;
}
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}
function sortedKeys(value: object) { return Object.keys(value).sort(); }
function harness(options: HarnessOptions = {}) {
  const calls = { auth: 0, configuration: 0, membership: 0, privateCredentials: 0, tokens: [] as string[], owners: [] as string[] };
  const handlers = createNativeBillingHandlers({
    resolveUser: async token => {
      calls.auth++; calls.tokens.push(token);
      if (options.authError) throw options.authError;
      if (options.auth) return options.auth;
      if (token === f.expiredToken) return { user: null, error: new Error(`Expired fixture session: ${f.revenueCatSecret}`) };
      if (token === f.anonymousToken) {
        const auth = nativeAuthFixture(); auth.user!.is_anonymous = true;
        return auth;
      }
      if (token !== f.validToken) return { user: null, error: new Error('Invalid fixture token') };
      return nativeAuthFixture();
    },
    publicConfiguration: platform => {
      calls.configuration++;
      return options.configuration ? options.configuration(platform) : nativeConfigurationFixture(platform);
    },
    membership: ownerId => {
      calls.membership++; calls.owners.push(ownerId);
      return options.membership ? options.membership(ownerId) : nativeStatusFixture();
    },
    privateCredentials: () => {
      calls.privateCredentials++;
      return [f.revenueCatSecret, f.stripeSecret, f.serviceRoleSecret, f.privateJwt];
    },
  });
  return { calls, handlers };
}
function request(body: unknown = { platform: 'ios' }, token: string | null = f.validToken) {
  return new Request('https://fixture.invalid/native-billing', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
}
function offlineTest(name: string, test: () => Promise<void>) {
  Deno.test({
    name, permissions: { net: false, env: false, read: false, write: false, run: false },
    async fn() {
      const originalFetch = globalThis.fetch;
      let fetchAttempts = 0;
      globalThis.fetch = async () => { fetchAttempts++; throw new Error('Network is forbidden in native billing fixtures.'); };
      try {
        await test();
        equal(fetchAttempts, 0, 'No fixture may attempt even a mocked HTTP/payment request');
      } finally { globalThis.fetch = originalFetch; }
    },
  });
}
async function rejected(response: Response, status: number) {
  equal(response.status, status, 'Expected fail-closed HTTP status');
  equal(response.headers.get('Cache-Control'), 'no-store', 'Rejected responses must not be cached');
  equal(response.headers.get('Access-Control-Allow-Origin'), '*', 'Rejected responses must include CORS');
  const text = await response.text();
  const payload = JSON.parse(text);
  equal(sortedKeys(payload), ['error'], 'Errors must expose only a static error field');
  assert(typeof payload.error === 'string' && payload.error.length > 0, 'An error message is required');
  const serialized = text + JSON.stringify(Array.from(response.headers.entries()));
  for (const privateValue of [f.revenueCatSecret, f.stripeSecret, f.serviceRoleSecret, f.privateJwt, f.validToken, f.expiredToken, f.appleSdkKey, f.googleSdkKey]) {
    assert(!serialized.includes(privateValue), 'Rejected responses must not leak credentials in the body or headers');
  }
}
function noBillingCalls(calls: ReturnType<typeof harness>['calls']) {
  equal(calls.configuration, 0, 'Invalid requests must not load SDK configuration');
  equal(calls.membership, 0, 'Invalid requests must not query membership/payment data');
  equal(calls.privateCredentials, 0, 'Invalid requests must not read server credentials');
}

for (const endpoint of ['configuration', 'subscription'] as const) {
  for (const [name, authorization] of [
    ['missing Authorization', null], ['API key instead of bearer', 'fixture-api-key'],
    ['wrong auth scheme', 'Basic fixture'], ['empty bearer', 'Bearer'],
    ['multiple bearer tokens', 'Bearer fixture-one,fixture-two'], ['bearer with extra words', 'Bearer fixture extra'],
  ] as const) {
    offlineTest(`${endpoint}: rejects ${name} before authentication/billing`, async () => {
      const h = harness();
      const req = request({}, null);
      req.headers.set('apikey', 'fixture-public-anon-key');
      if (authorization) req.headers.set('Authorization', authorization);
      await rejected(await h.handlers[endpoint](req), 401);
      equal(h.calls.auth, 0, 'Invalid header syntax must never invoke auth'); noBillingCalls(h.calls);
    });
  }
  offlineTest(`${endpoint}: rejects anonymous-user sessions even with a confirmed email`, async () => {
    const h = harness();
    await rejected(await h.handlers[endpoint](request({ platform: 'ios' }, f.anonymousToken)), 401);
    equal(h.calls.auth, 1, 'The anonymous JWT must be checked server-side'); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: rejects expired sessions without billing calls or auth error leakage`, async () => {
    const h = harness();
    await rejected(await h.handlers[endpoint](request({ platform: 'android' }, f.expiredToken)), 401);
    equal(h.calls.auth, 1, 'Expired tokens must use the auth boundary'); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: rejects auth transport exceptions without echoing private details`, async () => {
    const h = harness({ authError: new Error(`Authorization: Bearer ${f.serviceRoleSecret}`) });
    await rejected(await h.handlers[endpoint](request()), 401); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: rejects unverified email`, async () => {
    const auth = nativeAuthFixture(); auth.user!.email_confirmed_at = null;
    const h = harness({ auth });
    await rejected(await h.handlers[endpoint](request()), 403); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: auth error wins even if a user object is returned`, async () => {
    const h = harness({ auth: { ...nativeAuthFixture(), error: new Error('Fixture validation failure') } });
    await rejected(await h.handlers[endpoint](request()), 401); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: rejects invalid server account identity`, async () => {
    const auth = nativeAuthFixture(); auth.user!.id = 'not-a-cloud-uuid';
    const h = harness({ auth });
    await rejected(await h.handlers[endpoint](request()), 401); noBillingCalls(h.calls);
  });
  for (const field of ['userId', 'user_id', 'ownerId', 'accountId', 'app_user_id', 'customerId', 'email', 'receipt', 'entitlementId', 'subscribed', 'returnUrl']) {
    offlineTest(`${endpoint}: rejects client-supplied ${field}`, async () => {
      const h = harness();
      await rejected(await h.handlers[endpoint](request({ platform: 'ios', [field]: f.otherOwnerId })), 400);
      noBillingCalls(h.calls); equal(h.calls.owners, [], 'Other accounts must never reach billing');
    });
  }
  offlineTest(`${endpoint}: rejects client-supplied account ID even if it matches the signed-in owner`, async () => {
    const h = harness();
    await rejected(await h.handlers[endpoint](request({ platform: 'ios', userId: f.ownerId })), 400); noBillingCalls(h.calls);
  });
  const invalidBodies: { name: string; body: unknown }[] = [
    { name: 'null', body: null }, { name: 'array', body: [] }, { name: 'string', body: 'ios' },
    { name: 'missing platform', body: {} }, { name: 'web platform', body: { platform: 'web' } },
    { name: 'object platform', body: { platform: { value: 'ios' } } },
    { name: 'array platform', body: { platform: ['ios'] } }, { name: 'case-mismatched platform', body: { platform: 'IOS' } },
  ];
  for (const fixture of invalidBodies) {
    offlineTest(`${endpoint}: rejects ${fixture.name} body`, async () => {
      const h = harness();
      await rejected(await h.handlers[endpoint](request(fixture.body)), 400); noBillingCalls(h.calls);
    });
  }
  offlineTest(`${endpoint}: rejects malformed JSON`, async () => {
    const h = harness();
    const req = new Request('https://fixture.invalid/native-billing', { method: 'POST', headers: { Authorization: `Bearer ${f.validToken}` }, body: '{"platform":' });
    await rejected(await h.handlers[endpoint](req), 400); noBillingCalls(h.calls);
  });
  offlineTest(`${endpoint}: preflight and unsupported methods never invoke dependencies`, async () => {
    const h = harness();
    const preflight = await h.handlers[endpoint](new Request('https://fixture.invalid/native-billing', { method: 'OPTIONS' }));
    equal(preflight.status, 200, 'Preflight is public');
    equal(preflight.headers.get('Access-Control-Allow-Origin'), '*', 'Preflight must include CORS');
    equal(await preflight.text(), '', 'Preflight must not return configuration');
    await rejected(await h.handlers[endpoint](new Request('https://fixture.invalid/native-billing', { method: 'GET' })), 405);
    equal(h.calls.auth, 0, 'Early responses must not authenticate'); noBillingCalls(h.calls);
  });
  for (const field of ['REVENUECAT_SECRET_API_KEY', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'authorization', 'access_token', 'environment', 'subscriber', 'receipt']) {
    offlineTest(`${endpoint}: rejects accidental ${field} response fields instead of forwarding them`, async () => {
      const h = harness({
        configuration: platform => ({ ...nativeConfigurationFixture(platform), [field]: f.revenueCatSecret }),
        membership: () => ({ ...nativeStatusFixture(), [field]: f.serviceRoleSecret }),
      });
      await rejected(await h.handlers[endpoint](request()), endpoint === 'configuration' ? 503 : 502);
    });
  }
  offlineTest(`${endpoint}: provider exception bodies, URLs, and headers never become error responses`, async () => {
    const throwProviderError = () => { throw new Error(`https://fixture.invalid?key=${f.revenueCatSecret}; Authorization: Bearer ${f.privateJwt}`); };
    const h = harness({ configuration: throwProviderError, membership: throwProviderError });
    await rejected(await h.handlers[endpoint](request()), 502);
  });
  offlineTest(`${endpoint}: typed failure message mutations cannot expose a secret`, async () => {
    const error = new NativeBillingError('provider_unavailable');
    error.message = f.stripeSecret;
    const fail = () => { throw error; };
    const h = harness({ configuration: fail, membership: fail });
    await rejected(await h.handlers[endpoint](request()), 502);
  });
}

for (const platform of ['ios', 'android'] as const) {
  offlineTest(`configuration: accepts only the ${platform} public SDK key and exact public response fields`, async () => {
    const h = harness();
    const response = await h.handlers.configuration(request({ platform }));
    equal(response.status, 200, 'Verified account must receive valid public configuration');
    equal(response.headers.get('Cache-Control'), 'no-store', 'Public SDK configuration must not be cached');
    const text = await response.text();
    equal(JSON.parse(text), nativeConfigurationFixture(platform), 'Configuration must contain exactly the platform public allowlist');
    const otherSdk = platform === 'ios' ? f.googleSdkKey : f.appleSdkKey;
    assert(!text.includes(otherSdk), 'The other platform key must not be exposed');
    assert(!text.includes(f.revenueCatSecret) && !text.includes(f.serviceRoleSecret), 'Secrets must stay server-side');
    equal(h.calls.membership, 0, 'Configuration must never query a payment provider');
    equal(h.calls.tokens, [f.validToken], 'Only the request token is resolved');
  });
  for (const [caseIndex, sdkKey] of [f.revenueCatSecret, f.stripeSecret, f.serviceRoleSecret, f.privateJwt, 'test_fixtureStoreKey', platform === 'ios' ? f.googleSdkKey : f.appleSdkKey].entries()) {
    offlineTest(`configuration: rejects invalid/private ${platform} SDK key case ${caseIndex + 1}`,  async () => {
      const h = harness({ configuration: value => ({ ...nativeConfigurationFixture(value), sdkKey }) });
      await rejected(await h.handlers.configuration(request({ platform })), 503);
      equal(h.calls.membership, 0, 'Invalid SDK keys must never query membership');
    });
  }
  for (const field of ['productId', 'entitlementId']) {
    for (const privateValue of [f.revenueCatSecret, f.serviceRoleSecret]) {
      offlineTest(`configuration: rejects private credentials hidden in ${platform} ${field}`, async () => {
        const h = harness({ configuration: value => ({ ...nativeConfigurationFixture(value), [field]: `orchard.${privateValue}` }) });
        await rejected(await h.handlers.configuration(request({ platform })), 503);
      });
    }
  }
  offlineTest(`subscription: uses only the server-verified owner for ${platform}`, async () => {
    const h = harness();
    const response = await h.handlers.subscription(request({ platform }));
    equal(response.status, 200, 'Valid platform-only request must succeed with synthetic membership');
    equal(await response.json(), nativeStatusFixture(), 'Successful response must match the public status allowlist');
    equal(h.calls.owners, [f.ownerId], 'The provider identity must come solely from verified auth');
    equal(h.calls.configuration, 0, 'Subscription lookup must not disclose SDK configuration');
  });
}
for (const field of ['provider', 'tier', 'subscription_end', 'status', 'billing_mode', 'store', 'currency', 'interval']) {
  offlineTest(`subscription: rejects a private credential substituted into ${field}`, async () => {
    const h = harness({ membership: () => ({ ...nativeStatusFixture(), [field]: f.serviceRoleSecret }) });
    await rejected(await h.handlers.subscription(request()), 502);
  });
}
for (const body of [null, [], { sdkKey: f.revenueCatSecret }, { subscriber: { private_key: f.revenueCatSecret } }]) {
  offlineTest(`both endpoints: reject malformed/raw provider payload ${JSON.stringify(body).slice(0, 40)}`, async () => {
    const h = harness({ configuration: () => body, membership: () => body });
    await rejected(await h.handlers.configuration(request()), 503);
    await rejected(await h.handlers.subscription(request()), 502);
  });
}
for (const field of ['status', 'billing_mode'] as const) {
  offlineTest(`subscription: rejects object values disguised as ${field}`,  async () => {
    const empty = verifiedNativeStatus({}, { entitlementId: 'orchard_shift_membership', appleProductId: 'orchard_shift_monthly', googleProductId: 'orchard_shift_monthly:monthly' });
    const h = harness({ membership: () => ({ ...empty, [field]: { toString: () => empty[field], toJSON: () => f.serviceRoleSecret } }) });
    await rejected(await h.handlers.subscription(request()), 502);
  });
}
offlineTest('subscription: rejects a forged live entitlement in an otherwise sandbox response', async () => {
  const h = harness({ membership: () => ({ ...nativeStatusFixture(true), entitled: true }) });
  await rejected(await h.handlers.subscription(request()), 502);
});
offlineTest('subscription: preserves valid sandbox status without granting live access', async () => {
  const h = harness({ membership: () => nativeStatusFixture(true) });
  const response = await h.handlers.subscription(request());
  equal(response.status, 200, 'Safe sandbox status should display');
  const payload = await response.json();
  assert(payload.subscribed && !payload.entitled && payload.billing_mode === 'test', 'Sandbox must never grant live access');
});
offlineTest('subscription: preserves a valid no-membership response', async () => {
  const empty = verifiedNativeStatus({}, { entitlementId: 'orchard_shift_membership', appleProductId: 'orchard_shift_monthly', googleProductId: 'orchard_shift_monthly:monthly' });
  const h = harness({ membership: () => empty });
  const response = await h.handlers.subscription(request());
  equal(response.status, 200, 'A safe empty status must remain supported');
  equal(await response.json(), empty, 'No-membership status must not be promoted to subscribed');
});
