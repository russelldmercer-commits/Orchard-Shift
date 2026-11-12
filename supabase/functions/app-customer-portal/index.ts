import { appSubscriptions, billingContext, billingFailure, billingReturnUrl, preflight } from '../_shared/appBilling.ts';
import { jsonResponse } from '../_shared/cors.ts';
Deno.serve(async (req: Request) => {
  const early = preflight(req); if (early) return early;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.platform !== 'web') return jsonResponse({ error: 'Browser subscription management is not enabled in the native app pending billing review.' }, 403);
    const context = await billingContext(req);
    if (!context.customerId) return jsonResponse({ error: 'This account has no APP billing customer. Website billing is separate.' }, 404);
    const subscriptions = await appSubscriptions(context);
    if (!subscriptions.length) return jsonResponse({ error: 'No APP subscription exists to manage.' }, 404);
    // A dedicated configuration keeps APP management separate from website pricing and upgrades.
    const configurations = await context.stripe.billingPortal.configurations.list({ active: true, limit: 100 });
    let configuration = configurations.data.find(item => item.metadata?.app === 'orchard-shift-app-v1' && !item.features.subscription_update.enabled && item.features.subscription_cancel.enabled);
    if (!configuration) {
      configuration = await context.stripe.billingPortal.configurations.create({
        metadata: { app: 'orchard-shift-app-v1' },
        default_return_url: billingReturnUrl(context),
        features: {
          customer_update: { enabled: false },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
          subscription_cancel: { enabled: true, mode: 'at_period_end' },
          subscription_update: { enabled: false },
        },
      }, { idempotencyKey: 'orchard-shift-app-portal-v1' });
    }
    const portal = await context.stripe.billingPortal.sessions.create({ customer: context.customerId, configuration: configuration.id, return_url: billingReturnUrl(context) });
    console.log('[app-customer-portal] APP portal ready');
    return jsonResponse({ url: portal.url });
  } catch (error) { return billingFailure(error, 'app-customer-portal'); }
});
