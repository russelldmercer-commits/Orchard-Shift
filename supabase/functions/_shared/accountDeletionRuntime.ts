import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonResponse } from './cors.ts';
import { validateDeletionBody } from './accountDeletion.ts';
import { cloudAdmin } from './weeklyMealRuntime.ts';
import { billingContext, appSubscriptions, appPriceId, appProductId } from './appBilling.ts';
async function removeBrowserBilling(req: Request, ownerId: string) {
  const { data: mapping, error } = await cloudAdmin().from('membership_customers').select('stripe_customer_id').eq('user_id', ownerId).maybeSingle();
  if (error) throw new Error('mapping_failed');
  if (!mapping) return;
  const billing = await billingContext(req, { requireActivePrice: false });
  const subscriptions = await appSubscriptions(billing);
  for (const subscription of subscriptions) {
    // Never cancel mixed/website subscriptions, even under a misconfigured mapping.
    if (!subscription.items.data.every(item => item.price.id === appPriceId && (typeof item.price.product === 'string' ? item.price.product : item.price.product.id) === appProductId)) throw new Error('mixed_subscription');
    if (!['canceled', 'incomplete_expired'].includes(subscription.status)) await billing.stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
  }
  // Minimal APP/user metadata remains on retained billing records for cleanup retries.
  if (billing.customerId) await billing.stripe.customers.update(billing.customerId, { email: '', name: '', phone: '', address: '' });
}
async function removeNativeCustomer(ownerId: string) {
  const key = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!key) throw new Error('cleanup_not_configured');
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(ownerId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(12000) });
  if (!response.ok && response.status !== 404) throw new Error('provider_cleanup_failed');
}
export async function handleDeleteAccount(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Use POST.' }, 405);
  try {
    const match = /^Bearer\s+([^\s,]+)$/i.exec(req.headers.get('Authorization') ?? '');
    if (!match) return jsonResponse({ error: 'Sign in before deleting your account.' }, 401);
    if (Number(req.headers.get('content-length') ?? 0) > 2048) return jsonResponse({ error: 'Request too large.' }, 413);
    const text = await req.text(); if (text.length > 2048) return jsonResponse({ error: 'Request too large.' }, 413);
    let candidate: unknown; try { candidate = JSON.parse(text); } catch { return jsonResponse({ error: 'Invalid deletion request.' }, 400); }
    const body = validateDeletionBody(candidate);
    if (!body) return jsonResponse({ error: 'Your password and DELETE confirmation are required.' }, 400);
    const admin = cloudAdmin();
    const { data, error } = await admin.auth.getUser(match[1]);
    if (error || !data.user?.email || data.user.is_anonymous === true) return jsonResponse({ error: 'Your session expired. Sign in again.' }, 401);
    const url = Deno.env.get('SUPABASE_URL'); const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anonKey) throw new Error('auth_not_configured');
    const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const verified = await verifier.auth.signInWithPassword({ email: data.user.email, password: body.password });
    if (verified.error || verified.data.user?.id !== data.user.id) return jsonResponse({ error: 'Password verification failed. Check your password or use account recovery.' }, 403);
    await verifier.auth.signOut({ scope: 'local' });
    const pending = await admin.from('account_deletion_requests').upsert({ user_id: data.user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (pending.error) throw new Error('deletion_record_failed');
    await removeBrowserBilling(req, data.user.id);
    await removeNativeCustomer(data.user.id);
    const removed = await admin.auth.admin.deleteUser(data.user.id, false);
    if (removed.error) throw new Error('auth_deletion_failed');
    // Cloud profile, membership mapping and pending deletion marker cascade away.
    return jsonResponse({ deleted: true });
  } catch { return jsonResponse({ error: 'Deletion could not be completed. Some cleanup may already be complete. Retry this request; membership access is blocked if deletion has started.' }, 503); }
}
