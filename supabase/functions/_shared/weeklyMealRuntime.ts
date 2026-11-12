import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { validateWeeklyRelease, weekStart } from './weeklyMeals.ts';
import { releaseAvailability, safeReleaseInformation } from './releaseReadiness.ts';
export function cloudAdmin() {
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('cloud_unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function currentWeeklyRelease(environment: 'live' | 'test') {
  const { data, error } = await cloudAdmin().from('weekly_meal_releases')
    .select('id,week_of,environment,title,summary,reviewed_by,reviewed_at,published_at,meals')
    .eq('environment', environment).eq('week_of', weekStart(Date.now())).not('published_at', 'is', null).maybeSingle();
  if (error) throw new Error('publication_unavailable');
  return validateWeeklyRelease(data, environment);
}
export function publicReleaseInformation() {
  const base = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/app-public-information`;
  // User-confirmed public operator details, not a release approval or private credential.
  return safeReleaseInformation({ legalName: Deno.env.get('ORCHARD_LEGAL_NAME') ?? 'Russell Mercer', supportEmail: Deno.env.get('ORCHARD_SUPPORT_EMAIL') ?? 'russellmercer047@gmail.com', privacyUrl: Deno.env.get('ORCHARD_PRIVACY_URL') || `${base}/privacy`, termsUrl: Deno.env.get('ORCHARD_TERMS_URL') || `${base}/terms`, supportUrl: Deno.env.get('ORCHARD_SUPPORT_URL') || `${base}/support`, deletionUrl: Deno.env.get('ORCHARD_DELETION_URL') || `${base}/delete-account` });
}
export async function currentReleaseAvailability() {
  return releaseAvailability(Deno.env.get('ORCHARD_RELEASE_APPROVED') === 'true', publicReleaseInformation(), await currentWeeklyRelease('live'));
}
