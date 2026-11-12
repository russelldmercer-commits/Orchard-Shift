import { nativeBillingHandlers } from '../_shared/nativeBilling.ts';
// Auth/request rejection happens before any RevenueCat lookup; responses are allowlisted.
Deno.serve(nativeBillingHandlers.subscription);
