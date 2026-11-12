import { canViewWeeklyContent } from '../../../services/weeklyAccess.ts';
const now = Date.parse('2026-11-12T12:00:00Z');
const checkedAt = new Date(now - 10000).toISOString();
const live = { provider: 'revenuecat', subscribed: true, entitled: true, billing_mode: 'live' as const, subscription_end: new Date(now + 60000).toISOString() };
function assert(value: boolean, message: string) { if (!value) throw new Error(message); }
Deno.test('downloaded recipes require fresh matching server-verified membership', () => {
  assert(canViewWeeklyContent(live, 'live', checkedAt, now), 'Valid live access should remain visible');
  const testStatus = { ...live, billing_mode: 'test' as const, entitled: false };
  assert(canViewWeeklyContent(testStatus, 'test', checkedAt, now), 'Valid sandbox may show separate test recipes');
  assert(!canViewWeeklyContent(testStatus, 'live', checkedAt, now), 'Sandbox cannot show live recipes');
  assert(!canViewWeeklyContent(live, 'test', checkedAt, now), 'Live membership cannot show test recipes');
});
Deno.test('expiry, refund, stale checks and provider failures hide downloaded recipes', () => {
  for (const status of [null, { ...live, subscribed: false }, { ...live, entitled: false }, { ...live, provider: 'stripe' }, { ...live, subscription_end: new Date(now).toISOString() }, { ...live, subscription_end: 'invalid' }]) {
    assert(!canViewWeeklyContent(status, 'live', checkedAt, now), 'Unsafe cached access must fail closed');
  }
  for (const check of [null, 'invalid', new Date(now + 1).toISOString(), new Date(now - 90000).toISOString()]) {
    assert(!canViewWeeklyContent(live, 'live', check, now), 'Missing, future or stale verification must fail closed');
  }
});
