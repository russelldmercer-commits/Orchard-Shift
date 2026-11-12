// Production-only adapters. Offline fixtures import nativeBillingHandlers, never this module.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createNativeBillingHandlers } from './nativeBillingHandlers.ts';
import { NativeBillingError, type NativeAuthResult, type NativePlatform } from './nativeBillingValidation.ts';
import { verifiedNativeStatus, type NativePlanSettings, type RevenueCatSubscriber } from './nativeEntitlement.ts';
import { cloudAdmin } from './weeklyMealRuntime.ts';

export async function resolveNativeBillingUser(token: string): Promise<NativeAuthResult> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new NativeBillingError('unavailable');
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (!error && data.user) {
    const pending = await client.from('account_deletion_requests').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (pending.error) throw new NativeBillingError('unavailable');
    if (pending.data) return { user: null, error: 'account_deletion_pending' };
  }
  return {
    user: data.user ? { id: data.user.id, email_confirmed_at: data.user.email_confirmed_at, is_anonymous: data.user.is_anonymous } : null,
    error,
  };
}
export function nativePlanSettings(): NativePlanSettings {
  return {
    entitlementId: Deno.env.get('REVENUECAT_ENTITLEMENT_ID') || 'orchard_shift_membership',
    appleProductId: Deno.env.get('REVENUECAT_APPLE_PRODUCT_ID') || 'orchard_shift_monthly',
    googleProductId: Deno.env.get('REVENUECAT_GOOGLE_PRODUCT_ID') || 'orchard_shift_monthly:monthly',
  };
}
export function publicNativeConfiguration(platform: NativePlatform) {
  // Only public SDK keys may reach the device. The shared response guard validates every field.
  const sdkKey = Deno.env.get(platform === 'ios' ? 'REVENUECAT_APPLE_SDK_KEY' : 'REVENUECAT_GOOGLE_SDK_KEY');
  if (!sdkKey) throw new NativeBillingError('invalid_public_configuration');
  if (!Deno.env.get('REVENUECAT_SECRET_API_KEY')) throw new NativeBillingError('unavailable');
  const settings = nativePlanSettings();
  return { sdkKey, entitlementId: settings.entitlementId, productId: platform === 'ios' ? settings.appleProductId : settings.googleProductId, platform };
}
export async function serverNativeMembership(userId: string) {
  // Pending account cleanup cannot regain paid access or start new purchases.
  const pending = await cloudAdmin().from('account_deletion_requests').select('user_id').eq('user_id', userId).maybeSingle();
  if (pending.error || pending.data) throw new NativeBillingError('unavailable');
  // Read and use this secret only in Edge Functions. Never return or log it.
  const key = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!key) throw new NativeBillingError('unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      method: 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: controller.signal,
    });
    if (!response.ok) {
      console.error('[native-billing] RevenueCat status lookup failed', { status: response.status });
      throw new NativeBillingError('provider_unavailable');
    }
    const payload = await response.json() as { subscriber?: RevenueCatSubscriber };
    if (!payload.subscriber || typeof payload.subscriber !== 'object' || Array.isArray(payload.subscriber)) throw new NativeBillingError('invalid_response');
    return verifiedNativeStatus(payload.subscriber, nativePlanSettings());
  } finally { clearTimeout(timer); }
}
function privateNativeCredentials(): readonly string[] {
  // Only used internally to reject accidental credential values in otherwise public fields.
  return ['REVENUECAT_SECRET_API_KEY', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL']
    .map(name => Deno.env.get(name) ?? '').filter(value => value.length > 0);
}
export const nativeBillingHandlers = createNativeBillingHandlers({
  resolveUser: resolveNativeBillingUser,
  publicConfiguration: publicNativeConfiguration,
  membership: serverNativeMembership,
  privateCredentials: privateNativeCredentials,
});
