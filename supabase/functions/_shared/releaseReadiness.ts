// Pure validation: public legal/support metadata, never secrets or environment objects.
export interface ReleaseInformation { legalName: string; supportEmail: string; privacyUrl: string; termsUrl: string; supportUrl: string; deletionUrl: string }
export function safeReleaseInformation(values: Record<string, string | undefined>): ReleaseInformation | null {
  const safeText = (value: string | undefined, max = 200) => Boolean(value && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) && !/sk_|sb_secret_|eyJ[\w-]+\.[\w-]+\.[\w-]+|bearer\s/i.test(value));
  const url = (value: string | undefined) => {
    if (!value || value.length > 500) return false;
    try { const parsed = new URL(value); return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.hostname.includes('.') && !/localhost|\.invalid$|\.example$|example\.com$|127\.0\.0\.1|^10\.|^192\.168\./i.test(parsed.hostname) && safeText(value, 500); } catch { return false; }
  };
  if (!safeText(values.legalName) || !safeText(values.supportEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmail ?? '') || !['privacyUrl', 'termsUrl', 'supportUrl', 'deletionUrl'].every(key => url(values[key]))) return null;
  return { legalName: values.legalName!, supportEmail: values.supportEmail!, privacyUrl: values.privacyUrl!, termsUrl: values.termsUrl!, supportUrl: values.supportUrl!, deletionUrl: values.deletionUrl! };
}
export function releaseAvailability(approved: boolean, information: ReleaseInformation | null, publication: { week_of: string; title: string } | null) {
  const ready = approved && Boolean(information && publication);
  return { ready, weekOf: publication?.week_of ?? null, title: publication?.title ?? null, information,
    message: ready ? 'A new weekly meal collection is available.' : 'New subscriptions are paused until this week’s reviewed meals and release requirements are ready.' };
}
