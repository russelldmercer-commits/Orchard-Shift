import { corsHeaders } from '../_shared/cors.ts';
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  // This public HTTPS landing page never uses secrets, session tokens, or grants an entitlement.
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orchard Shift · Billing</title></head><body><main><h1>Return to Orchard Shift</h1><p>You can close this browser tab and return to your membership screen.</p><p>Choose <strong>Check membership status</strong> there. A browser return does not confirm payment; the app checks Stripe securely.</p><p>Website memberships remain separate. If you cancelled checkout, no new membership will appear.</p></main></body></html>', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' } });
});
