import { validateDeletionBody } from './accountDeletion.ts';
import { validateWeeklyRelease, weekStart } from './weeklyMeals.ts';
import { safeReleaseInformation, releaseAvailability } from './releaseReadiness.ts';
const now = Date.parse('2026-11-12T12:00:00Z');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function test(name: string, fn: () => void) { Deno.test({ name, permissions: { net: false, env: false, read: false, write: false, run: false }, fn }); }
function fixture(environment: 'live' | 'test' = 'live') {
  return { id: 'fixture-release', week_of: '2026-11-09', title: 'Fixture only', summary: 'Synthetic publication for offline validation, never published to members.', environment, reviewed_by: 'Fixture reviewer', reviewed_at: '2026-11-08T10:00:00Z', published_at: '2026-11-09T00:00:00Z', meals: Array.from({ length: 21 }, (_, index) => ({ id: `fixture-meal-${index}`, day: Math.floor(index / 3), slot: ['Breakfast', 'Lunch', 'Dinner'][index % 3], name: 'Fixture bowl', style: 'Fixture', description: 'Synthetic offline test record', minutes: 20, kcal: 500, protein: 25, fiber: 10, ingredients: [{ name: 'cooked beans', quantity: 150, unit: 'g' }, { name: 'vegetables', quantity: 200, unit: 'g' }], steps: ['Fixture instruction.'] })) };
}
test('deletion requires fresh password and explicit confirmation; rejects supplied identities', () => {
  assert(validateDeletionBody({ password: 'fixture-password', confirmation: 'DELETE' }), 'Valid deletion confirmation must work');
  for (const value of [null, [], {}, { password: '123', confirmation: 'DELETE' }, { password: 'fixture-password', confirmation: 'delete' }, { password: 'fixture-password', confirmation: 'DELETE', user_id: 'other-account' }, { password: 'fixture-password', confirmation: 'DELETE', token: 'fixture' }]) assert(!validateDeletionBody(value), 'Unsafe deletion request must be rejected');
});
test('weekly content requires a complete current-week reviewed publication', () => {
  assert(weekStart(now) === '2026-11-09', 'Weeks start Monday UTC');
  assert(validateWeeklyRelease(fixture(), 'live', now), 'Valid reviewed collection must be accepted');
  for (const patch of [{ week_of: '2026-11-02' }, { reviewed_at: null }, { published_at: null }, { published_at: '2026-12-01' }, { reviewed_at: '2026-11-20' }, { environment: 'test' }, { meals: fixture().meals.slice(0, 20) }]) assert(!validateWeeklyRelease({ ...fixture(), ...patch }, 'live', now), 'Stale, incomplete, unreviewed, future or sandbox content must be rejected');
});
test('sandbox readers can never select live publications', () => {
  assert(!validateWeeklyRelease(fixture('live'), 'test', now), 'Sandbox cannot read live row');
  assert(validateWeeklyRelease(fixture('test'), 'test', now), 'Sandbox can read a separate test row');
});
test('weekly recipe schema rejects duplicates, secret patterns and impossible values', () => {
  const duplicate = fixture(); duplicate.meals[1].id = duplicate.meals[0].id;
  assert(!validateWeeklyRelease(duplicate, 'live', now), 'Duplicate recipes must fail');
  const secret = fixture(); secret.meals[0].description = 'sk_fixturePrivateNeverUse';
  assert(!validateWeeklyRelease(secret, 'live', now), 'Private-key patterns cannot become content');
  const invalid = fixture(); invalid.meals[0].ingredients[0].quantity = -10;
  assert(!validateWeeklyRelease(invalid, 'live', now), 'Negative quantities must fail');
});
test('release remains closed without reviewed policies, operator contact and current meals', () => {
  assert(!safeReleaseInformation({ legalName: 'Fixture', supportEmail: 'bad-email' }), 'Incomplete metadata must fail');
  assert(!releaseAvailability(true, null, fixture()).ready, 'Missing public policies must block purchasing');
  const info = safeReleaseInformation({ legalName: 'Fixture operator', supportEmail: 'support@orchardshift.test', privacyUrl: 'https://orchardshift.test/privacy', termsUrl: 'https://orchardshift.test/terms', supportUrl: 'https://orchardshift.test/support', deletionUrl: 'https://orchardshift.test/delete-account' });
  assert(info, 'Safe synthetic metadata should validate');
  for (const patch of [{ legalName: '   ' }, { legalName: '\nOperator' }, { supportEmail: 'bad-email' }, { privacyUrl: 'http://orchardshift.test/privacy' }, { supportUrl: 'https://orchardshift.test/support?token=private' }, { deletionUrl: 'https://example.com/delete-account' }]) assert(!safeReleaseInformation({ ...info, ...patch }), 'Unsafe public metadata must fail');
  const longUrl = `https://orchardshift.test/${'p'.repeat(240)}`;
  assert(safeReleaseInformation({ ...info, privacyUrl: longUrl }), 'Safe URLs up to 500 characters must match Expo build validation');
  assert(!releaseAvailability(false, info, fixture()).ready, 'Owner approval is required');
  assert(!releaseAvailability(true, info, null).ready, 'Missing current meals must pause new purchases');
  assert(releaseAvailability(true, info, fixture()).ready, 'All prerequisites should open availability');
});
