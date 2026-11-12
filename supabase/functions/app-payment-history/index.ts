import { appPriceId, appProductId, appSubscriptions, billingContext, billingFailure, preflight } from '../_shared/appBilling.ts';
import { invoiceSummary, isExclusiveAppInvoice, isOwnedAppSubscriptionInvoice, stripeObjectId } from '../_shared/appInvoiceHistory.ts';
import type { InvoiceScope } from '../_shared/appInvoiceHistory.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const early = preflight(req); if (early) return early;
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return jsonResponse({ error: 'Provide a valid payment history request.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'cursor')) return jsonResponse({ error: 'Only a pagination cursor is accepted. Account and customer IDs are never accepted.' }, 400);
    const cursor = (body as { cursor?: unknown }).cursor ?? null;
    if (cursor !== null && (typeof cursor !== 'string' || !/^in_[a-zA-Z0-9]{1,120}$/.test(cursor))) return jsonResponse({ error: 'The history cursor is invalid. Refresh your history.' }, 400);

    // JWT/email verification, exact APP price identity, owner-scoped mapping, and customer metadata checks are shared with billing.
    // This endpoint only reads. It never creates a customer, changes an invoice, or starts billing; native viewing is allowed.
    const context = await billingContext(req, { requireActivePrice: false });
    const base = { billing_mode: context.livemode ? 'live' : 'test', has_customer: Boolean(context.customerId), checked_at: new Date().toISOString() };
    if (!context.customerId) return jsonResponse({ ...base, invoices: [], next_cursor: null, has_more: false });

    const subscriptions = await appSubscriptions(context);
    const subscriptionIds = new Set(subscriptions
      .filter(subscription => subscription.items.data.length > 0 && subscription.items.data.every(item => item.price.id === appPriceId))
      .map(subscription => subscription.id));
    if (!subscriptionIds.size) return jsonResponse({ ...base, invoices: [], next_cursor: null, has_more: false });
    const scope: InvoiceScope = { customerId: context.customerId, userId: context.user.id, subscriptionIds, priceId: appPriceId, productId: appProductId, livemode: context.livemode };
    if (cursor) {
      // Stripe cursors must also belong to this mapped customer. A guessed invoice ID cannot change the query scope.
      let previous;
      try { previous = await context.stripe.invoices.retrieve(cursor); }
      catch (error) {
        if ((error as { code?: string }).code === 'resource_missing') return jsonResponse({ error: 'The history cursor is invalid. Refresh your history.' }, 400);
        throw error;
      }
      if (stripeObjectId(previous.customer) !== context.customerId || previous.livemode !== context.livemode) return jsonResponse({ error: 'The history cursor is invalid. Refresh your history.' }, 400);
    }

    const invoices: ReturnType<typeof invoiceSummary>[] = [];
    let nextCursor: string | null = cursor;
    let hasMore = false;
    // Bound scanning to 60 candidate invoices per request. Empty filtered pages retain a cursor for older records.
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      const page = await context.stripe.invoices.list({ customer: context.customerId, limit: 20, ...(nextCursor ? { starting_after: nextCursor } : {}) });
      for (const invoice of page.data) {
        if (!isOwnedAppSubscriptionInvoice(invoice, scope)) continue;
        if (invoice.lines.has_more) {
          const lines = [];
          let truncated = false;
          for await (const line of context.stripe.invoices.listLineItems(invoice.id, { limit: 100 })) {
            if (lines.length >= 500) { truncated = true; break; }
            lines.push(line);
          }
          invoice.lines = { ...invoice.lines, data: lines, has_more: truncated };
        }
        if (isExclusiveAppInvoice(invoice, scope)) invoices.push(invoiceSummary(invoice));
      }
      hasMore = page.has_more && page.data.length > 0;
      nextCursor = hasMore ? page.data[page.data.length - 1].id : null;
      if (invoices.length || !hasMore) break;
    }
    console.log('[app-payment-history] APP invoice page read', { count: invoices.length, hasMore });
    // No emails, addresses, card details, provider URLs, website invoices, or raw Stripe objects are returned.
    return jsonResponse({ ...base, invoices, next_cursor: nextCursor, has_more: hasMore });
  } catch (error) { return billingFailure(error, 'app-payment-history'); }
});
