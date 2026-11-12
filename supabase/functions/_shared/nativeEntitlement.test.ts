import { verifiedNativeStatus, type NativePlanSettings, type RevenueCatSubscriber } from './nativeEntitlement.ts';
const settings: NativePlanSettings = { entitlementId: 'orchard_shift_membership', appleProductId: 'orchard_shift_monthly', googleProductId: 'orchard_shift_monthly:monthly' };
const now = Date.parse('2026-11-12T12:00:00Z');
const future = '2026-12-12T12:00:00Z';
const past = '2026-10-12T12:00:00Z';
function fixture(sandbox = false): RevenueCatSubscriber {
  return { entitlements: { orchard_shift_membership: { product_identifier: 'orchard_shift_monthly', expires_date: future } }, subscriptions: { orchard_shift_monthly: { store: 'app_store', is_sandbox: sandbox, expires_date: future, refunded_at: null, unsubscribe_detected_at: null } } };
}
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
Deno.test('Live matching monthly Apple subscription is server-entitled', () => {
  const status = verifiedNativeStatus(fixture(), settings, now);
  assert(status.subscribed && status.entitled && status.billing_mode === 'live', 'Expected verified live subscription');
});
Deno.test('Sandbox purchase never grants a live entitlement', () => {
  const status = verifiedNativeStatus(fixture(true), settings, now);
  assert(status.subscribed && !status.entitled && status.billing_mode === 'test', 'Sandbox must be isolated');
});
Deno.test('Expired and refunded purchases are denied', () => {
  const expired = fixture();
  expired.entitlements!.orchard_shift_membership.expires_date = past;
  assert(!verifiedNativeStatus(expired, settings, now).entitled, 'Expired entitlement must be denied');
  const refunded = fixture();
  refunded.subscriptions!.orchard_shift_monthly.refunded_at = past;
  assert(!verifiedNativeStatus(refunded, settings, now).subscribed, 'Refund must revoke access');
});
Deno.test('Cancellation retains access until verified expiry', () => {
  const data = fixture(); data.subscriptions!.orchard_shift_monthly.unsubscribe_detected_at = past;
  const status = verifiedNativeStatus(data, settings, now);
  assert(status.entitled && status.cancel_at_period_end, 'Period-end cancellation must preserve paid access');
});
Deno.test('Missing sandbox flag, website store, and unrelated product are denied', () => {
  const missing = fixture(); delete missing.subscriptions!.orchard_shift_monthly.is_sandbox;
  assert(!verifiedNativeStatus(missing, settings, now).entitled, 'Missing mode must fail closed');
  const website = fixture(); website.subscriptions!.orchard_shift_monthly.store = 'stripe';
  assert(!verifiedNativeStatus(website, settings, now).subscribed, 'Website billing must not grant native access');
  const wrong = fixture(); wrong.entitlements!.orchard_shift_membership.product_identifier = 'other_product';
  assert(!verifiedNativeStatus(wrong, settings, now).subscribed, 'Only allowlisted products are valid');
});
Deno.test('Lifetime and malformed expiry values cannot unlock a monthly plan', () => {
  const data = fixture(); data.entitlements!.orchard_shift_membership.expires_date = null;
  assert(!verifiedNativeStatus(data, settings, now).entitled, 'Null expiry is not a monthly subscription');
  data.entitlements!.orchard_shift_membership.expires_date = 'invalid';
  assert(!verifiedNativeStatus(data, settings, now).entitled, 'Malformed expiry must fail closed');
});
Deno.test('Google requires the configured base plan', () => {
  const data: RevenueCatSubscriber = { entitlements: { orchard_shift_membership: { product_identifier: 'orchard_shift_monthly', product_plan_identifier: 'monthly', expires_date: future } }, subscriptions: { orchard_shift_monthly: { store: 'play_store', is_sandbox: false, expires_date: future } } };
  assert(verifiedNativeStatus(data, settings, now).entitled, 'Matching Google monthly plan must be valid');
  data.entitlements!.orchard_shift_membership.product_plan_identifier = 'annual';
  assert(!verifiedNativeStatus(data, settings, now).entitled, 'Other Google base plans must be denied');
});
Deno.test('Grace access requires future dates from both server records', () => {
  const data = fixture();
  data.entitlements!.orchard_shift_membership.expires_date = past;
  data.subscriptions!.orchard_shift_monthly.expires_date = past;
  data.entitlements!.orchard_shift_membership.grace_period_expires_date = future;
  assert(!verifiedNativeStatus(data, settings, now).entitled, 'One-sided grace must not grant access');
  data.subscriptions!.orchard_shift_monthly.grace_period_expires_date = future;
  data.subscriptions!.orchard_shift_monthly.billing_issues_detected_at = past;
  const status = verifiedNativeStatus(data, settings, now);
  assert(status.entitled && status.status === 'grace_period', 'Both validated grace dates should retain access');
});
