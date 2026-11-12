import type Stripe from 'https://esm.sh/stripe@18.5.0?target=deno';

export interface InvoiceScope {
  customerId: string;
  userId: string;
  subscriptionIds: ReadonlySet<string>;
  priceId: string;
  productId: string;
  livemode: boolean;
}
export function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}
export function isOwnedAppSubscriptionInvoice(invoice: Stripe.Invoice, scope: InvoiceScope): boolean {
  const parent = invoice.parent;
  if (stripeObjectId(invoice.customer) !== scope.customerId || invoice.livemode !== scope.livemode || parent?.type !== 'subscription_details') return false;
  const details = parent.subscription_details;
  const subscriptionId = stripeObjectId(details?.subscription);
  return Boolean(subscriptionId && scope.subscriptionIds.has(subscriptionId) && details?.metadata?.app === 'orchard-shift-app-v1' && details.metadata.user_id === scope.userId);
}
export function isExclusiveAppInvoice(invoice: Stripe.Invoice, scope: InvoiceScope): boolean {
  if (!isOwnedAppSubscriptionInvoice(invoice, scope) || !['paid', 'open', 'void', 'uncollectible'].includes(invoice.status ?? '') || invoice.currency !== 'usd') return false;
  // Fail closed for mixed invoices or incompletely loaded lines: no website line, description, or total is returned.
  return !invoice.lines.has_more && invoice.lines.data.length > 0 && invoice.lines.data.every(line =>
    line.livemode === scope.livemode && line.pricing?.type === 'price_details' &&
    stripeObjectId(line.pricing.price_details?.price) === scope.priceId &&
    stripeObjectId(line.pricing.price_details?.product) === scope.productId,
  );
}
function isoDate(seconds: number | null | undefined): string | null {
  return seconds == null ? null : new Date(seconds * 1000).toISOString();
}
export function invoiceSummary(invoice: Stripe.Invoice) {
  const periods = invoice.lines.data.map(line => line.period);
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    created_at: isoDate(invoice.created),
    paid_at: isoDate(invoice.status_transitions.paid_at),
    period_start: isoDate(Math.min(...periods.map(period => period.start))),
    period_end: isoDate(Math.max(...periods.map(period => period.end))),
    total: invoice.total,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    credited_after_payment: invoice.post_payment_credit_notes_amount,
  };
}
