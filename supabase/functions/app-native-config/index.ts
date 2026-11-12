import { nativeBillingHandlers } from '../_shared/nativeBilling.ts';
// The same handler is exercised by offline fixtures, with production-only adapters here.
Deno.serve(nativeBillingHandlers.configuration);
