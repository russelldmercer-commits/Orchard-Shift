// Extra response-boundary regression tests; synthetic data, no runtime adapters.
// deno test --no-config --no-remote supabase/functions/_shared/nativeBillingResponse.test.ts
import {
  validatePublicNativeConfiguration, validateNativeMembershipResponse, nativeBillingFailure, NativeBillingError,
} from './nativeBillingValidation.ts';
import { nativeBillingFixtures as f, nativeConfigurationFixture, nativeStatusFixture } from './nativeBilling.fixtures.ts';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function offlineTest(name: string, fn: () => void | Promise<void>) {
  Deno.test({ name, permissions: { net: false, env: false, read: false, write: false, run: false }, fn });
}
function expectRejected(operation: () => unknown) {
  let caught: unknown = null;
  try { operation(); } catch (error) { caught = error; }
  assert(caught instanceof NativeBillingError, 'Unsafe response must be rejected by the actual production guard');
}
const secrets = [f.revenueCatSecret, f.stripeSecret, f.serviceRoleSecret];

offlineTest('response guards reject configured secrets even when they look like public SDK keys', () => {
  const accidentalPrivateValue = f.appleSdkKey;
  expectRejected(() => validatePublicNativeConfiguration(nativeConfigurationFixture('ios'), 'ios', [accidentalPrivateValue]));
});
offlineTest('response guards reject missing required fields without forwarding partial provider objects', () => {
  const config = nativeConfigurationFixture('ios'); delete config.entitlementId;
  expectRejected(() => validatePublicNativeConfiguration(config, 'ios', secrets));
  const status = nativeStatusFixture(); delete status.entitled;
  expectRejected(() => validateNativeMembershipResponse(status, secrets));
});
offlineTest('response guards enforce primitive boolean and price types, not truthiness', () => {
  for (const field of ['subscribed', 'entitled', 'cancel_at_period_end', 'has_customer', 'checkout_ready']) {
    expectRejected(() => validateNativeMembershipResponse({ ...nativeStatusFixture(), [field]: 'true' }, secrets));
  }
  expectRejected(() => validateNativeMembershipResponse({ ...nativeStatusFixture(), amount: '1299' }, secrets));
});
offlineTest('response guards reject a response containing the other platform configuration', () => {
  expectRejected(() => validatePublicNativeConfiguration(nativeConfigurationFixture('android'), 'ios', secrets));
});
offlineTest('response projection cannot execute a hidden provider toJSON credential leak', () => {
  const source = nativeConfigurationFixture('ios');
  let serializationCalls = 0;
  Object.defineProperty(source, 'toJSON', {
    enumerable: false,
    value: () => { serializationCalls++; return { private_key: f.revenueCatSecret }; },
  });
  const safe = validatePublicNativeConfiguration(source, 'ios', secrets);
  const serialized = JSON.stringify(safe);
  assert(serializationCalls === 0, 'Never invoke provider serialization hooks');
  assert(!serialized.includes(f.revenueCatSecret), 'Projection must not expose the secret');
  assert(serialized.includes(f.appleSdkKey), 'The explicitly authorized public SDK key must remain usable');
});
offlineTest('response projection snapshots fields once before serialization', () => {
  const source = nativeConfigurationFixture('ios');
  let reads = 0;
  Object.defineProperty(source, 'productId', {
    enumerable: true,
    get: () => { reads++; return reads === 1 ? 'orchard_shift_monthly' : f.revenueCatSecret; },
  });
  const safe = validatePublicNativeConfiguration(source, 'ios', secrets);
  assert(reads === 1 && !JSON.stringify(safe).includes(f.revenueCatSecret), 'Mutable provider getters must never be serialized directly');
});
offlineTest('sanitized error responses never serialize arbitrary provider exception properties', async () => {
  const exception = new Error(f.serviceRoleSecret);
  Object.assign(exception, { headers: { Authorization: `Bearer ${f.revenueCatSecret}` }, body: f.stripeSecret });
  const response = nativeBillingFailure(exception);
  const text = await response.text();
  assert(response.status === 502, 'Unknown provider errors must fail closed');
  assert(Object.keys(JSON.parse(text)).join(',') === 'error', 'Only a static error is public');
  assert(secrets.every(secret => !text.includes(secret)), 'Private exception data must not escape');
});
