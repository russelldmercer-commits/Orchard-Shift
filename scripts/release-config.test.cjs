// Real Expo config-loader regression tests; fixture approvals never change Cloud or store settings.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cli = require.resolve('expo/bin/cli', { paths: [root] });
const flags = ['ORCHARD_POLICIES_REVIEWED', 'ORCHARD_STORES_CONFIGURED', 'ORCHARD_WEEKLY_CONTENT_REVIEWED', 'ORCHARD_BACKEND_VERIFIED', 'ORCHARD_SIGNED_TESTS_PASSED', 'ORCHARD_RELEASE_APPROVED'];
const fixture = {
  ORCHARD_RELEASE_BUILD: 'true', ORCHARD_IOS_BUNDLE_ID: 'org.orchardfixture.app', ORCHARD_ANDROID_PACKAGE: 'org.orchardfixture.app',
  ORCHARD_LEGAL_NAME: 'Synthetic offline fixture', ORCHARD_SUPPORT_EMAIL: 'support@orchardfixture.test',
  EXPO_PUBLIC_SUPABASE_URL: 'https://orchardfixture.test',
  ...Object.fromEntries(flags.map(key => [key, 'true'])),
};
function config(overrides) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith('ORCHARD_') || name.startsWith('EXPO_PUBLIC_') || name === 'EAS_BUILD_PROFILE') delete env[name];
  }
  Object.assign(env, { EXPO_NO_DOTENV: '1', CI: '1', ...overrides });
  return spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
}
function parsed(result) {
  assert.equal(result.status, 0, 'Expo public config must load without a runtime helper import');
  return JSON.parse(result.stdout);
}
function blocked(result) {
  assert.notEqual(result.status, 0, 'Incomplete production configuration must fail');
  assert.match(`${result.stdout || ''}${result.stderr || ''}`, /Production build blocked:/);
}
test('preview config includes confirmed public contact without granting release approval', () => {
  const value = parsed(config({ ORCHARD_RELEASE_BUILD: 'false' }));
  assert.equal(value.name, 'Orchard Shift');
  assert.equal(value.extra.orchardRelease.releaseBuild, false);
  assert.equal(value.extra.orchardRelease.information.legalName, 'Russell Mercer');
  assert.equal(value.extra.orchardRelease.information.supportEmail, 'russellmercer047@gmail.com');
  assert.match(value.extra.orchardRelease.information.privacyUrl, /^https:\/\//);
  assert.equal(value.icon, './assets/orchard-icon.jpg');
});
test('both production entry points block incomplete releases', () => {
  blocked(config({ ORCHARD_RELEASE_BUILD: 'true' }));
  blocked(config({ EAS_BUILD_PROFILE: 'production' }));
});
test('every individual release attestation is mandatory', () => {
  for (const flag of flags) blocked(config({ ...fixture, [flag]: 'false' }));
});
test('placeholder identifiers, invalid contact and unsafe URLs cannot pass', () => {
  for (const patch of [
    { ORCHARD_IOS_BUNDLE_ID: 'com.example.orchard' },
    { ORCHARD_ANDROID_PACKAGE: 'com.example.orchard' },
    { ORCHARD_LEGAL_NAME: '' },
    { ORCHARD_SUPPORT_EMAIL: '' },
    { ORCHARD_LEGAL_NAME: '   ' },
    { ORCHARD_SUPPORT_EMAIL: 'invalid' },
    { ORCHARD_PRIVACY_URL: 'http://orchardfixture.test/privacy' },
    { ORCHARD_TERMS_URL: 'https://example.com/terms' },
    { ORCHARD_SUPPORT_URL: 'https://orchardfixture.test/support?token=private' },
  ]) blocked(config({ ...fixture, ...patch }));
});
test('valid fixtures preserve identifiers and never bundle server credentials or attestations', () => {
  const sentinels = {
    STRIPE_SECRET_KEY: 'sk_fixture_do_not_use', REVENUECAT_SECRET_API_KEY: 'fixture_rc_private_do_not_use',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture_service_role_do_not_use', SUPABASE_DB_URL: 'postgres://fixture_private_do_not_use',
  };
  const result = config({ ...fixture, ...sentinels });
  const value = parsed(result);
  assert.equal(value.ios.bundleIdentifier, fixture.ORCHARD_IOS_BUNDLE_ID);
  assert.equal(value.android.package, fixture.ORCHARD_ANDROID_PACKAGE);
  assert.equal(value.extra.orchardRelease.releaseBuild, true);
  assert.equal(value.extra.orchardRelease.information.legalName, fixture.ORCHARD_LEGAL_NAME);
  assert.equal(value.extra.orchardRelease.information.supportEmail, fixture.ORCHARD_SUPPORT_EMAIL);
  for (const secret of Object.values(sentinels)) assert.ok(!result.stdout.includes(secret), 'Server credential must not enter Expo config');
  for (const flag of flags) assert.ok(!result.stdout.includes(flag), 'Build attestations must not enter the public config');
});
