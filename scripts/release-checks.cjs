// One local command for non-network safety checks after dependencies and Deno are installed.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['nativeBillingRequest', 'nativeBillingResponse', 'nativeEntitlement', 'releaseSafety', 'weeklyAccess', 'nativeRequestLimits'].map(name => `supabase/functions/_shared/${name}.test.ts`);
function run(label, command, args) {
  console.log(`CHECK: ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', timeout: 600000 });
  if (result.error || result.status !== 0) {
    console.error(`BLOCKED: ${label}. Ensure dependencies and Deno are installed; fix the reported failure before release.`);
    process.exit(result.status || 1);
  }
}
run('Offline request, entitlement, cached access and release fixtures', 'deno', ['test', '--no-config', '--no-remote', ...files]);
let tsc;
try { tsc = require.resolve('typescript/bin/tsc', { paths: [root] }); }
catch { console.error('BLOCKED: Install project dependencies before running TypeScript checks.'); process.exit(1); }
run('TypeScript', process.execPath, [tsc, '--noEmit']);
run('Expo loader and production-build guards', process.execPath, ['--test', 'scripts/release-config.test.cjs']);
console.log('Local safety checks passed. Deployed pages, real store setup, recipe/policy review and installed-device testing are still required.');
