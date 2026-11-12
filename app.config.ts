import type { ConfigContext, ExpoConfig } from 'expo/config';
// Expo evaluates this config before dependency installation and does not resolve
// imported TypeScript helpers. Keep build validation self-contained here.
interface PublicReleaseInformation {
  legalName: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  supportUrl: string;
  deletionUrl: string;
}
function safeReleaseInformation(values: Record<string, string | undefined>): PublicReleaseInformation | null {
  const safeText = (value: string | undefined): boolean => Boolean(
    value && value.trim().length > 0 && value.length <= 500 && !/[\u0000-\u001f\u007f]/.test(value) && !/sk_|sb_secret_|eyJ[\w-]+\.[\w-]+\.[\w-]+|bearer\s/i.test(value),
  );
  const safeUrl = (value: string | undefined): boolean => {
    if (!safeText(value)) return false;
    try {
      const parsed = new URL(value!);
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
        !parsed.search && !parsed.hash && parsed.hostname.includes('.') &&
        !/localhost|\.invalid$|\.example$|example\.com$|127\.0\.0\.1|^10\.|^192\.168\./i.test(parsed.hostname);
    } catch { return false; }
  };
  if (!safeText(values.legalName) || (values.legalName?.length ?? 0) > 200 ||
      !safeText(values.supportEmail) || (values.supportEmail?.length ?? 0) > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmail ?? '') ||
      !['privacyUrl', 'termsUrl', 'supportUrl', 'deletionUrl'].every(key => safeUrl(values[key]))) return null;
  return {
    legalName: values.legalName!, supportEmail: values.supportEmail!,
    privacyUrl: values.privacyUrl!, termsUrl: values.termsUrl!,
    supportUrl: values.supportUrl!, deletionUrl: values.deletionUrl!,
  };
}

// Build-time PUBLIC metadata only. Never read or embed payment, service-role or database secrets.
export default function orchardConfig({ config }: ConfigContext): ExpoConfig {
  const releaseBuild = process.env.ORCHARD_RELEASE_BUILD === 'true' || process.env.EAS_BUILD_PROFILE === 'production';
  const iosId = process.env.ORCHARD_IOS_BUNDLE_ID || config.ios?.bundleIdentifier;
  const androidId = process.env.ORCHARD_ANDROID_PACKAGE || config.android?.package;
  const base = `${(process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gomqzwxyzxyccxodgomq.backend.onspace.ai').replace(/\/$/, '')}/functions/v1/app-public-information`;
  const information = safeReleaseInformation({
    // User-confirmed public contact; this does not attest to policy or release review.
    legalName: process.env.ORCHARD_LEGAL_NAME ?? 'Russell Mercer',
    supportEmail: process.env.ORCHARD_SUPPORT_EMAIL ?? 'russellmercer047@gmail.com',
    privacyUrl: process.env.ORCHARD_PRIVACY_URL || `${base}/privacy`,
    termsUrl: process.env.ORCHARD_TERMS_URL || `${base}/terms`,
    supportUrl: process.env.ORCHARD_SUPPORT_URL || `${base}/support`,
    deletionUrl: process.env.ORCHARD_DELETION_URL || `${base}/delete-account`,
  });
  if (releaseBuild) {
    const missing: string[] = [];
    if (!iosId || !/^[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*){2,}$/.test(iosId) || /^com\.example\./i.test(iosId)) missing.push('registered ORCHARD_IOS_BUNDLE_ID');
    if (!androidId || !/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*){2,}$/.test(androidId) || /^com\.example\./i.test(androidId)) missing.push('registered ORCHARD_ANDROID_PACKAGE');
    if (!information) missing.push('actual operator name, monitored support email and valid public policy URLs');
    for (const name of ['ORCHARD_POLICIES_REVIEWED', 'ORCHARD_STORES_CONFIGURED', 'ORCHARD_WEEKLY_CONTENT_REVIEWED', 'ORCHARD_BACKEND_VERIFIED', 'ORCHARD_SIGNED_TESTS_PASSED', 'ORCHARD_RELEASE_APPROVED']) {
      if (process.env[name] !== 'true') missing.push(name);
    }
    if (missing.length) throw new Error(`Production build blocked: ${missing.join('; ')}. Complete RELEASE-CHECKLIST.md; do not set review flags before doing the checks.`);
  }
  return {
    ...config, name: config.name || 'Orchard Shift', slug: config.slug || 'orchard-shift',
    icon: './assets/orchard-icon.jpg',
    ios: { ...config.ios, ...(iosId ? { bundleIdentifier: iosId } : {}) },
    android: { ...config.android, ...(androidId ? { package: androidId } : {}) },
    extra: { ...config.extra, orchardRelease: { releaseBuild, information } },
  };
}
