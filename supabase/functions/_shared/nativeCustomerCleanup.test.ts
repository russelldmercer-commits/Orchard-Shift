import { confirmNativeCustomerRemoval } from './nativeCustomerCleanup.ts';
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function fixture(statuses: number[]) {
  let calls = 0; let waits = 0;
  return { dependencies: { erase: () => Promise.resolve(statuses[Math.min(calls++, statuses.length - 1)]), wait: (_milliseconds: number) => { waits++; return Promise.resolve(); } }, calls: () => calls, waits: () => waits };
}
Deno.test('already absent native customer completes without live APIs or waiting', async () => {
  const run = fixture([404]);
  assert(await confirmNativeCustomerRemoval(run.dependencies), '404 confirms absence');
  assert(run.calls() === 1 && run.waits() === 0, 'No redundant calls');
});
Deno.test('queued RevenueCat deletion is not reported complete until an absence response', async () => {
  const run = fixture([200, 200, 404]);
  assert(await confirmNativeCustomerRemoval(run.dependencies), 'Confirmed absence completes cleanup');
  assert(run.calls() === 3 && run.waits() === 2, 'Queued cleanup is bounded');
});
Deno.test('queued deletion without confirmation keeps the Cloud deletion pending', async () => {
  const run = fixture([200]);
  assert(!await confirmNativeCustomerRemoval(run.dependencies), '200 alone never grants completion');
  assert(run.calls() === 3, 'Return for retry instead of an endless Edge Function');
});
Deno.test('unexpected provider status never authorizes final account removal', async () => {
  for (const status of [201, 204, 401, 403, 429, 500]) {
    const run = fixture([status]);
    assert(!await confirmNativeCustomerRemoval(run.dependencies), 'Unexpected response must fail closed');
    assert(run.calls() === 1 && run.waits() === 0, 'Do not hammer an unavailable provider');
  }
});
Deno.test('network failures propagate without fabricating cleanup success', async () => {
  let failed = false;
  try { await confirmNativeCustomerRemoval({ erase: () => Promise.reject(new Error('Synthetic network failure')), wait: () => Promise.resolve() }); }
  catch { failed = true; }
  assert(failed, 'A network error must leave cleanup unconfirmed');
});
