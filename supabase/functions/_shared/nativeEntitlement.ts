// Pure, fail-closed validation of RevenueCat's server response. No client flags grant access.
export interface NativePlanSettings { entitlementId: string; appleProductId: string; googleProductId: string }
interface EntitlementRecord {
  product_identifier?: string; product_plan_identifier?: string | null;
  expires_date?: string | null; grace_period_expires_date?: string | null;
}
interface SubscriptionRecord {
  store?: string; expires_date?: string | null; grace_period_expires_date?: string | null;
  is_sandbox?: boolean; refunded_at?: string | null; unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
}
export interface RevenueCatSubscriber {
  entitlements?: Record<string, EntitlementRecord>;
  subscriptions?: Record<string, SubscriptionRecord>;
}
function effectiveEnd(record: EntitlementRecord | SubscriptionRecord): number {
  const expiry = record.expires_date ? Date.parse(record.expires_date) : 0;
  const grace = record.grace_period_expires_date ? Date.parse(record.grace_period_expires_date) : 0;
  return Math.max(Number.isFinite(expiry) ? expiry : 0, Number.isFinite(grace) ? grace : 0);
}
export function verifiedNativeStatus(subscriber: RevenueCatSubscriber, settings: NativePlanSettings, now = Date.now()) {
  const entitlement = subscriber.entitlements?.[settings.entitlementId];
  const base = entitlement?.product_identifier ?? '';
  const full = entitlement?.product_plan_identifier && !base.includes(':') ? `${base}:${entitlement.product_plan_identifier}` : base;
  const subscription = subscriber.subscriptions?.[full] ?? subscriber.subscriptions?.[base];
  const matching = Boolean(subscription && (
    (subscription.store === 'app_store' && full === settings.appleProductId) ||
    (subscription.store === 'play_store' && full === settings.googleProductId)
  ));
  const end = matching && entitlement && subscription ? Math.min(effectiveEnd(entitlement), effectiveEnd(subscription)) : 0;
  const valid = matching && typeof subscription?.is_sandbox === 'boolean' && !subscription.refunded_at;
  const active = valid && end > now;
  const expired = valid && end > 0 && !active;
  const sandbox = subscription?.is_sandbox !== false;
  return {
    provider: 'revenuecat', subscribed: active, entitled: active && !sandbox,
    tier: active ? 'Orchard Shift Membership' : null,
    status: active ? subscription?.billing_issues_detected_at ? 'grace_period' : 'active' : expired ? 'expired' : 'none',
    subscription_end: valid && end > 0 ? new Date(end).toISOString() : null,
    cancel_at_period_end: Boolean(valid && subscription?.unsubscribe_detected_at),
    billing_mode: sandbox ? 'test' : 'live', has_customer: matching,
    checkout_ready: !active, amount: 1299, currency: 'usd', interval: 'month',
    store: matching ? subscription?.store : null,
  };
}
