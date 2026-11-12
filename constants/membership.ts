// Public Stripe IDs only. All billing secrets live in Edge Function environment variables.
export const membership = {
  name: 'Orchard Shift Membership',
  displayPrice: '$12.99',
  currency: 'USD',
  interval: 'month',
  productId: 'prod_Vc3tv90843HSfC',
  priceId: 'price_1UaplJIcVZrZcqJyQ9GxyFGY',
  // Purchase availability is checked at runtime against reviewed weekly content and release approval.
  nativePurchasingImplemented: true,
};
