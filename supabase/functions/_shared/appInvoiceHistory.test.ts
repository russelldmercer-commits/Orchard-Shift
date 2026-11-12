import type Stripe from 'https://esm.sh/stripe@18.5.0?target=deno';
import { invoiceSummary, isExclusiveAppInvoice, isOwnedAppSubscriptionInvoice } from './appInvoiceHistory.ts';
import type { InvoiceScope } from './appInvoiceHistory.ts';

const scope: InvoiceScope = { customerId: 'cus_app_owner', userId: 'owner-a', subscriptionIds: new Set(['sub_app_owner']), priceId: 'price_app', productId: 'prod_app', livemode: false };
function fixture(): Stripe.Invoice {
  return {
    id: 'in_appinvoice', number: 'APP-001', customer: scope.customerId, livemode: false, currency: 'usd', status: 'paid',
    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_app_owner', metadata: { app: 'orchard-shift-app-v1', user_id: scope.userId } } },
    lines: { has_more: false, data: [{ livemode: false, pricing: { type: 'price_details', price_details: { price: scope.priceId, product: scope.productId } }, period: { start: 1700000000, end: 1702592000 } }] },
    created: 1700000000, status_transitions: { paid_at: 1700000020 }, total: 1299, amount_paid: 1299, amount_remaining: 0, post_payment_credit_notes_amount: 0,
  } as unknown as Stripe.Invoice;
}
function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
Deno.test('includes only verified APP subscription invoices for their mapped owner', () => {
  assert(isExclusiveAppInvoice(fixture(), scope), 'The mapped APP invoice should be included.');
});
Deno.test('rejects another customer, user, subscription, and Stripe mode', () => {
  const otherCustomer = fixture(); otherCustomer.customer = 'cus_other';
  assert(!isOwnedAppSubscriptionInvoice(otherCustomer, scope), 'Another customer must be rejected.');
  const otherUser = fixture(); otherUser.parent!.subscription_details!.metadata!.user_id = 'owner-b';
  assert(!isOwnedAppSubscriptionInvoice(otherUser, scope), 'Another user must be rejected.');
  const otherSubscription = fixture(); otherSubscription.parent!.subscription_details!.subscription = 'sub_website';
  assert(!isOwnedAppSubscriptionInvoice(otherSubscription, scope), 'A website subscription must be rejected.');
  const live = fixture(); live.livemode = true;
  assert(!isExclusiveAppInvoice(live, scope), 'Test and live history cannot be mixed.');
});
Deno.test('rejects website prices and mixed invoice lines', () => {
  const website = fixture(); website.lines.data[0].pricing!.price_details!.price = 'price_website';
  assert(!isExclusiveAppInvoice(website, scope), 'A website-priced invoice must be rejected.');
  const mixed = fixture(); mixed.lines.data.push(website.lines.data[0]);
  assert(!isExclusiveAppInvoice(mixed, scope), 'A mixed APP/website invoice must be rejected entirely.');
});
Deno.test('rejects drafts, missing APP metadata, and incomplete line collections', () => {
  const draft = fixture(); draft.status = 'draft';
  assert(!isExclusiveAppInvoice(draft, scope), 'Draft invoices must be hidden.');
  const missingMarker = fixture(); missingMarker.parent!.subscription_details!.metadata!.app = 'website';
  assert(!isExclusiveAppInvoice(missingMarker, scope), 'The APP marker is required.');
  const partial = fixture(); partial.lines.has_more = true;
  assert(!isExclusiveAppInvoice(partial, scope), 'Partial lines cannot prove APP exclusivity.');
});
Deno.test('keeps issued open, void, and uncollectible invoices accurately labelled', () => {
  for (const status of ['open', 'void', 'uncollectible'] as const) {
    const invoice = fixture(); invoice.status = status;
    assert(isExclusiveAppInvoice(invoice, scope), `Issued ${status} invoices should be visible.`);
    assert(invoiceSummary(invoice).status === status, 'The status must not be rewritten as paid.');
  }
});
Deno.test('returns a minimal read-only summary, not customer or payment details', () => {
  const summary = invoiceSummary(fixture());
  assert(summary.amount_paid === 1299 && summary.amount_remaining === 0, 'Amounts remain in cents.');
  assert(summary.period_start === new Date(1700000000000).toISOString(), 'The subscription line period is preserved.');
  for (const field of ['customer', 'customer_email', 'hosted_invoice_url', 'invoice_pdf', 'subscription', 'payment_settings', 'metadata']) {
    assert(!(field in summary), `Do not expose ${field}.`);
  }
});
