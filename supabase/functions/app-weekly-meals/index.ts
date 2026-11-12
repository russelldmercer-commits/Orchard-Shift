import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { validateNativeBillingRequest, nativeBillingFailure } from '../_shared/nativeBillingValidation.ts';
import { resolveNativeBillingUser, serverNativeMembership } from '../_shared/nativeBilling.ts';
import { currentWeeklyRelease, currentReleaseAvailability } from '../_shared/weeklyMealRuntime.ts';
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Use POST.' }, 405);
  try {
    if (Number(req.headers.get('content-length') ?? 0) > 1024) return jsonResponse({ error: 'Request too large.' }, 413);
    const text = await req.text(); if (text.length > 1024) return jsonResponse({ error: 'Request too large.' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return jsonResponse({ error: 'Invalid request.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonResponse({ error: 'Invalid request.' }, 400);
    if (Object.keys(body).length === 1 && body.action === 'availability') return jsonResponse(await currentReleaseAvailability());
    if (Object.keys(body).length !== 2 || body.action !== 'read' || (body.platform !== 'ios' && body.platform !== 'android')) return jsonResponse({ error: 'Only action and native platform are accepted.' }, 400);
    const validationRequest = new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({ platform: body.platform }) });
    const context = await validateNativeBillingRequest(validationRequest, resolveNativeBillingUser);
    const membership = await serverNativeMembership(context.userId);
    // Sandbox reviewers can receive TEST rows only; a sandbox flag never authorizes LIVE content.
    const environment = membership.entitled && membership.billing_mode === 'live' ? 'live' : membership.subscribed && membership.billing_mode === 'test' ? 'test' : null;
    if (!environment) return jsonResponse({ error: 'An active store membership is required.' }, 403);
    const release = await currentWeeklyRelease(environment);
    if (!release) return jsonResponse({ error: 'This week’s reviewed meals are not published yet. Please check again later.' }, 503);
    // Projected and validated recipes only. No account, credentials or raw provider records.
    return jsonResponse({ release });
  } catch (error) { return nativeBillingFailure(error); }
});
