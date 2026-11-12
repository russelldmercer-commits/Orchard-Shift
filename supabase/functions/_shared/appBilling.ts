import Stripe from 'https://esm.sh/stripe@18.5.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonResponse } from './cors.ts';

// These are public identifiers, not credentials. Never use the website product.
export const appPriceId = 'price_1UaplJIcVZrZcqJyQ9GxyFGY';
export const appProductId = 'prod_Vc3tv90843HSfC';
const appMarker = 'orchard-shift-app-v1';
class BillingError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function billingContext(req: Request, options: { requireActivePrice?: boolean } = {}) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new BillingError('Sign in to view or manage your APP membership.', 401);
  // Secrets are read only by the Edge Function runtime, never by client code.
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!url || !serviceKey || !stripeKey) throw new BillingError('Server billing configuration is incomplete.', 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) throw new BillingError('Your session has expired. Please sign in again.', 401);
  if (!data.user.email_confirmed_at) throw new BillingError('Verify your email before subscribing.', 403);
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil', httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  const price = await stripe.prices.retrieve(appPriceId);
  const productId = typeof price.product === 'string' ? price.product : price.product.id;
  // Read-only invoice history remains available if this otherwise matching price is archived.
  if ((options.requireActivePrice !== false && !price.active) || productId !== appProductId || price.unit_amount !== 1299 || price.currency !== 'usd' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) {
    throw new BillingError('The separate $12.99/month APP price is not ready in this Stripe mode. Website billing is unchanged.', 503);
  }
  const { data: mapping, error: mappingError } = await admin.from('membership_customers').select('stripe_customer_id').eq('user_id', data.user.id).maybeSingle();
  if (mappingError) throw new BillingError('Unable to read the APP membership mapping.', 503);
  let customerId: string | null = mapping?.stripe_customer_id ?? null;
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || customer.metadata.app !== appMarker || customer.metadata.user_id !== data.user.id) {
      throw new BillingError('APP customer ownership could not be verified. Contact support; no website customer will be linked automatically.', 409);
    }
  }
  return { admin, stripe, user: data.user, customerId, livemode: price.livemode, backendUrl: url.replace(/\/$/, '') };
}
export type BillingContext = Awaited<ReturnType<typeof billingContext>>;
export async function ensureAppCustomer(ctx: BillingContext) {
  if (ctx.customerId) return ctx.customerId;
  // An idempotency key handles concurrent requests; never search customers by email.
  const customer = await ctx.stripe.customers.create({ email: ctx.user.email, metadata: { app: appMarker, user_id: ctx.user.id } }, { idempotencyKey: `${appMarker}-customer-${ctx.user.id}` });
  const { error } = await ctx.admin.from('membership_customers').insert({ user_id: ctx.user.id, stripe_customer_id: customer.id });
  if (error) {
    const { data: mapping, error: readError } = await ctx.admin.from('membership_customers').select('stripe_customer_id').eq('user_id', ctx.user.id).maybeSingle();
    if (readError || mapping?.stripe_customer_id !== customer.id) throw new BillingError('Unable to save the APP customer mapping. No checkout was created.', 503);
  }
  ctx.customerId = customer.id;
  return customer.id;
}
export async function appSubscriptions(ctx: BillingContext) {
  if (!ctx.customerId) return [];
  const result: Stripe.Subscription[] = [];
  // Pagination prevents unrelated or old subscriptions from hiding a current one.
  for await (const subscription of ctx.stripe.subscriptions.list({ customer: ctx.customerId, status: 'all', limit: 100 })) {
    if (subscription.metadata.app === appMarker && subscription.metadata.user_id === ctx.user.id && subscription.items.data.some(item => item.price.id === appPriceId)) result.push(subscription);
  }
  return result;
}
export async function membershipStatus(ctx: BillingContext) {
  const subscriptions = await appSubscriptions(ctx);
  const subscription = subscriptions.find(s => s.status === 'active') ?? subscriptions.find(s => ['trialing','past_due','unpaid','incomplete','paused'].includes(s.status));
  const item = subscription?.items.data.find(item => item.price.id === appPriceId);
  const end = item?.current_period_end ?? null;
  // An unsigned client flag, browser redirect, or overdue invoice never grants access.
  const active = subscription?.status === 'active' && end !== null && end * 1000 > Date.now();
  return {
    subscribed: active,
    // Future paid endpoints must verify this server-side; test purchases cannot unlock live content.
    entitled: active && ctx.livemode,
    tier: active ? 'APP Membership' : null,
    status: subscription?.status ?? 'none',
    subscription_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
    billing_mode: ctx.livemode ? 'live' : 'test',
    has_customer: Boolean(ctx.customerId),
    checkout_ready: true,
    amount: 1299,
    currency: 'usd',
    interval: 'month',
  };
}
export function billingReturnUrl(ctx: BillingContext) {
  // Stripe browser checkout uses HTTPS, not a custom native scheme or arbitrary client URL.
  return `${ctx.backendUrl}/functions/v1/app-billing-return`;
}
export function billingFailure(error: unknown, endpoint: string) {
  if (error instanceof BillingError) return jsonResponse({ error: error.message }, error.status);
  const stripeError = error as { type?: string; code?: string; statusCode?: number };
  // Never log tokens, keys, customer emails, complete URLs, or raw provider responses.
  console.error(`[${endpoint}] request failed`, { type: stripeError.type ?? 'server', code: stripeError.code ?? 'unknown' });
  return jsonResponse({ error: 'Stripe billing could not complete this request. Check server configuration and try again.' }, 502);
}
export function preflight(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Use POST.' }, 405);
  return null;
}
