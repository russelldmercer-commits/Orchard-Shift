// Synthetic values only. This module never reads Cloud secrets or calls an API.
import type { NativeAuthResult, NativePlatform } from './nativeBillingValidation.ts';
import { verifiedNativeStatus } from './nativeEntitlement.ts';

export const nativeBillingFixtures = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  otherOwnerId: '22222222-2222-4222-8222-222222222222',
  validToken: 'fixture-valid-session',
  expiredToken: 'fixture-expired-session',
  anonymousToken: 'fixture-anonymous-session',
  revenueCatSecret: 'sk_fixtureRevenueCatNeverUse',
  stripeSecret: 'sk_test_fixtureStripeNeverUse',
  serviceRoleSecret: 'fixture-service-role-private-value',
  privateJwt: 'eyJmaXh0dXJlIjoiYWxnIn0.eyJmaXh0dXJlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl',
  appleSdkKey: 'appl_fixtureApplePublic123',
  googleSdkKey: 'goog_fixtureGooglePublic123',
} as const;
export function nativeAuthFixture(): NativeAuthResult {
  return { user: { id: nativeBillingFixtures.ownerId, email_confirmed_at: '2026-11-12T10:00:00Z', is_anonymous: false }, error: null };
}
export function nativeConfigurationFixture(platform: NativePlatform): Record<string, unknown> {
  return {
    sdkKey: platform === 'ios' ? nativeBillingFixtures.appleSdkKey : nativeBillingFixtures.googleSdkKey,
    entitlementId: 'orchard_shift_membership',
    productId: platform === 'ios' ? 'orchard_shift_monthly' : 'orchard_shift_monthly:monthly',
    platform,
  };
}
export function nativeStatusFixture(sandbox = false): Record<string, unknown> {
  return verifiedNativeStatus({
    entitlements: { orchard_shift_membership: { product_identifier: 'orchard_shift_monthly', expires_date: '2026-12-12T12:00:00Z' } },
    subscriptions: { orchard_shift_monthly: { store: 'app_store', is_sandbox: sandbox, expires_date: '2026-12-12T12:00:00Z' } },
  }, { entitlementId: 'orchard_shift_membership', appleProductId: 'orchard_shift_monthly', googleProductId: 'orchard_shift_monthly:monthly' }, Date.parse('2026-11-12T12:00:00Z'));
}
