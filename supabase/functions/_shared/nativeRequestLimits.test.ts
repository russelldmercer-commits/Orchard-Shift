import { validateNativeBillingRequest, NativeBillingError } from './nativeBillingValidation.ts';
Deno.test('oversized native requests fail before any auth or billing adapter runs', async () => {
  let resolutions = 0;
  const resolveUser = async () => { resolutions++; return { user: null, error: null }; };
  const candidates = [
    new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Length': '2048' }, body: '{}' }),
    new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer fixture' }, body: JSON.stringify({ platform: 'ios', padding: 'x'.repeat(2048) }) }),
    new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer fixture' }, body: JSON.stringify({ platform: 'ios', padding: 'é'.repeat(600) }) }),
    new Request('https://fixture.test', { method: 'POST', headers: { Authorization: `Bearer ${'x'.repeat(8193)}` }, body: '{"platform":"ios"}' }),
  ];
  for (const request of candidates) {
    let rejected = false;
    try { await validateNativeBillingRequest(request, resolveUser); }
    catch (error) { rejected = error instanceof NativeBillingError && error.code === 'invalid_request'; }
    if (!rejected) throw new Error('Oversized request must be rejected');
  }
  if (resolutions !== 0) throw new Error('Rejected requests must not call authentication or provider adapters');
});
