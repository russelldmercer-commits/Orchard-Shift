import { billingContext, billingFailure, membershipStatus, preflight } from '../_shared/appBilling.ts';
import { jsonResponse } from '../_shared/cors.ts';
Deno.serve(async (req: Request) => {
  const early = preflight(req); if (early) return early;
  try {
    const context = await billingContext(req);
    return jsonResponse(await membershipStatus(context));
  } catch (error) { return billingFailure(error, 'app-check-subscription'); }
});
