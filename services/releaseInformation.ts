import Constants from 'expo-constants';
import { safeReleaseInformation } from '@/supabase/functions/_shared/releaseReadiness';
import type { ReleaseInformation } from './weeklyMeals';
// Public operator metadata only; usable even if content delivery is temporarily offline.
export function bundledReleaseInformation(): ReleaseInformation | null {
  const value = Constants.expoConfig?.extra?.orchardRelease?.information as ReleaseInformation | null | undefined;
  if (!value || typeof value !== 'object') return null;
  return safeReleaseInformation({ legalName: value.legalName, supportEmail: value.supportEmail, privacyUrl: value.privacyUrl, termsUrl: value.termsUrl, supportUrl: value.supportUrl, deletionUrl: value.deletionUrl });
}
