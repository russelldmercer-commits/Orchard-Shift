import { appPriceId, appSubscriptions, billingContext, billingFailure, billingReturnUrl, ensureAppCustomer, preflight } from '../_shared/appBilling.ts';
import { jsonResponse } from '../_shared/cors.ts';
const newBrowserCheckoutEnabled = false; // Native weekly-meal release only; existing management/history remain intact.
Deno.serve(async (req: Request) => {
  const early = preflight(req); if (early) return early;
  try {
    if (!newBrowserCheckoutEnabled) return jsonResponse({ error: 'New browser subscriptions are paused. Use the installed app for weekly meal membership.' }, 503);
    const body = await req.json().catch(() => ({}));
    // Native digital purchasing intentionally remains unavailable pending store-compliance review.
    if (body.platform !== 'web') return jsonResponse({ error: 'Native purchasing is not enabled. Store-compliant billing requires separate implementation and testing.' }, 403);
    const context = await billingContext(req);
    const customerId = await ensureAppCustomer(context);
    const subscriptions = await appSubscriptions(context);
    if (subscriptions.some(s => ['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status))) return jsonResponse({ error: 'An APP subscription already exists. Refresh status or manage it instead of creating another.' }, 409);
    // Reuse an open session on retries to prevent parallel subscription checkouts.
    const sessions = await context.stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 100 });
    const existing = sessions.data.find(session => session.mode === 'subscription' && session.metadata?.app === 'orchard-shift-app-v1' && session.metadata?.price_id === appPriceId);
    if (existing?.url) return jsonResponse({ url: existing.url });
    const session = await context.stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: context.user.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: appPriceId, quantity: 1 }],
      metadata: { app: 'orchard-shift-app-v1', user_id: context.user.id, price_id: appPriceId },
      subscription_data: { metadata: { app: 'orchard-shift-app-v1', user_id: context.user.id } },
      success_url: billingReturnUrl(context),
      cancel_url: billingReturnUrl(context),
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    }, { idempotencyKey: `orchard-app-checkout-${context.user.id}-${Math.floor(Date.now() / 1800000)}` });
    if (!session.url) return jsonResponse({ error: 'Stripe did not return a checkout URL.' }, 502);
    console.log('[app-create-checkout] APP checkout ready');
    return jsonResponse({ url: session.url });
  } catch (error) { return billingFailure(error, 'app-create-checkout'); }
});
