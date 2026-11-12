// Offline-testable trust boundaries. No environment reads, SDKs, or network imports.
import { corsHeaders, jsonResponse } from './cors.ts';
import type { verifiedNativeStatus } from './nativeEntitlement.ts';

export type NativePlatform = 'ios' | 'android';
const failures = {
  sign_in_required: { status: 401, message: 'Please sign in to manage your membership.' },
  session_expired: { status: 401, message: 'Your session has expired. Please sign in again.' },
  email_unverified: { status: 403, message: 'Verify your email before subscribing.' },
  invalid_request: { status: 400, message: 'Only an iOS or Android platform is accepted. Account and purchase identifiers cannot be supplied.' },
  unavailable: { status: 503, message: 'Membership verification is not configured.' },
  invalid_public_configuration: { status: 503, message: 'The public store configuration was rejected. Check server configuration.' },
  provider_unavailable: { status: 502, message: 'RevenueCat could not verify this membership. Please try again or check server configuration.' },
  invalid_response: { status: 502, message: 'The membership response was rejected by security validation.' },
} as const;
export class NativeBillingError extends Error {
  constructor(public readonly code: keyof typeof failures) { super(failures[code].message); }
}
export interface NativeAuthResult {
  user: { id: string; email_confirmed_at?: string | null; is_anonymous?: boolean } | null;
  error: unknown;
}
export type ResolveNativeUser = (token: string) => Promise<NativeAuthResult>;
export interface PublicNativeConfiguration {
  sdkKey: string; entitlementId: string; productId: string; platform: NativePlatform;
}
export type NativeMembershipResponse = ReturnType<typeof verifiedNativeStatus>;

export function nativePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Use POST.' }, 405);
  return null;
}
export async function validateNativeBillingRequest(req: Request, resolveUser: ResolveNativeUser) {
  // Strict bearer syntax; neither apikey alone nor an anonymous-user JWT is membership auth.
  const match = /^Bearer\s+([^\s,]+)$/i.exec(req.headers.get('Authorization') ?? '');
  if (!match) throw new NativeBillingError('sign_in_required');
  // Bound payloads before authentication or provider adapters are called.
  const length = req.headers.get('content-length');
  if (match[1].length > 8192 || (length !== null && (!/^\d+$/.test(length) || Number(length) > 1024))) throw new NativeBillingError('invalid_request');
  let raw: string;
  try { raw = await req.text(); } catch { throw new NativeBillingError('invalid_request'); }
  if (new TextEncoder().encode(raw).byteLength > 1024) throw new NativeBillingError('invalid_request');
  let auth: NativeAuthResult;
  try { auth = await resolveUser(match[1]); }
  catch (error) {
    if (error instanceof NativeBillingError) throw error;
    throw new NativeBillingError('session_expired');
  }
  if (auth.error || !auth.user || auth.user.is_anonymous === true) throw new NativeBillingError('session_expired');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)) throw new NativeBillingError('session_expired');
  if (!auth.user.email_confirmed_at) throw new NativeBillingError('email_unverified');
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new NativeBillingError('invalid_request'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new NativeBillingError('invalid_request');
  const fields = Object.keys(body);
  const platform = (body as Record<string, unknown>).platform;
  if (fields.length !== 1 || fields[0] !== 'platform' || (platform !== 'ios' && platform !== 'android')) throw new NativeBillingError('invalid_request');
  // The request can select a platform, never the account, receipt, or entitlement.
  return { userId: auth.user.id, platform };
}

function publicRecord(payload: unknown, keys: readonly string[], code: 'invalid_public_configuration' | 'invalid_response', secrets: readonly string[]) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new NativeBillingError(code);
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(record, key))) throw new NativeBillingError(code);
  // Project into a fresh object: never serialize provider objects or their toJSON methods.
  const projected = Object.fromEntries(keys.map(key => [key, record[key]]));
  for (const value of Object.values(projected)) {
    if (typeof value !== 'string') continue;
    // Recognizable private credentials and exact configured secrets are both fail-closed.
    if (/sk_|sb_secret_|bearer\s|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i.test(value) || secrets.some(secret => secret.length > 0 && value.includes(secret))) throw new NativeBillingError(code);
  }
  return projected;
}
export function validatePublicNativeConfiguration(payload: unknown, platform: NativePlatform, secrets: readonly string[]): PublicNativeConfiguration {
  const data = publicRecord(payload, ['sdkKey', 'entitlementId', 'productId', 'platform'], 'invalid_public_configuration', secrets);
  const prefix = platform === 'ios' ? /^appl_[a-zA-Z0-9]+$/ : /^goog_[a-zA-Z0-9]+$/;
  const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/;
  if (data.platform !== platform || typeof data.sdkKey !== 'string' || !prefix.test(data.sdkKey) ||
      typeof data.entitlementId !== 'string' || !identifier.test(data.entitlementId) ||
      typeof data.productId !== 'string' || !identifier.test(data.productId)) throw new NativeBillingError('invalid_public_configuration');
  return data as unknown as PublicNativeConfiguration;
}
export function validateNativeMembershipResponse(payload: unknown, secrets: readonly string[]): NativeMembershipResponse {
  const data = publicRecord(payload, [
    'provider', 'subscribed', 'entitled', 'tier', 'status', 'subscription_end', 'cancel_at_period_end',
    'billing_mode', 'has_customer', 'checkout_ready', 'amount', 'currency', 'interval', 'store',
  ], 'invalid_response', secrets);
  const booleanKeys = ['subscribed', 'entitled', 'cancel_at_period_end', 'has_customer', 'checkout_ready'];
  const validEnd = typeof data.subscription_end === 'string' && Number.isFinite(Date.parse(data.subscription_end)) && new Date(data.subscription_end).toISOString() === data.subscription_end;
  if (data.provider !== 'revenuecat' || booleanKeys.some(key => typeof data[key] !== 'boolean') ||
      typeof data.status !== 'string' || !['none', 'expired', 'active', 'grace_period'].includes(data.status) ||
      typeof data.billing_mode !== 'string' || !['test', 'live'].includes(data.billing_mode) ||
      data.amount !== 1299 || data.currency !== 'usd' || data.interval !== 'month' ||
      (data.subscription_end !== null && !validEnd) ||
      (data.store !== null && data.store !== 'app_store' && data.store !== 'play_store') ||
      data.tier !== (data.subscribed ? 'Orchard Shift Membership' : null) ||
      (data.entitled && (!data.subscribed || data.billing_mode !== 'live')) ||
      data.checkout_ready !== !data.subscribed ||
      data.has_customer !== (data.store !== null) ||
      (data.subscribed && (!validEnd || !data.has_customer || (data.status !== 'active' && data.status !== 'grace_period'))) ||
      (!data.subscribed && (data.status === 'active' || data.status === 'grace_period'))) throw new NativeBillingError('invalid_response');
  return data as unknown as NativeMembershipResponse;
}
export function nativeBillingFailure(error: unknown): Response {
  // Even a provider exception containing a private key can only select a static message.
  const failure = error instanceof NativeBillingError ? failures[error.code] : undefined;
  return jsonResponse({ error: failure?.message ?? 'Unable to verify membership securely. Check your connection and try again.' }, failure?.status ?? 502);
}
