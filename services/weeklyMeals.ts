import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';
import { invokeBilling, type ServiceResult } from './membership';
import { validateWeeklyRelease } from '@/supabase/functions/_shared/weeklyMeals';
import { weeklyGroceries as buildWeeklyGroceries, type WeeklyRecipe } from './weeklyMealPlan';
export type { WeeklyRecipe } from './weeklyMealPlan';
export interface ReleaseInformation { legalName: string; supportEmail: string; privacyUrl: string; termsUrl: string; supportUrl: string; deletionUrl: string }
export interface ReleaseAvailability { ready: boolean; weekOf: string | null; title: string | null; information: ReleaseInformation | null; message: string }
export interface WeeklyRelease { id: string; week_of: string; environment: 'live' | 'test'; title: string; summary: string; meals: WeeklyRecipe[] }
export async function fetchReleaseAvailability(): Promise<ServiceResult<ReleaseAvailability>> {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke('app-weekly-meals', { body: { action: 'availability' } });
    if (error) { if (error instanceof FunctionsHttpError) { try { await error.context.text(); } catch { /* Do not echo provider details. */ } } return { data: null, error: 'Weekly meal availability could not be checked. Try again later.' }; }
    if (!data || typeof data.ready !== 'boolean' || typeof data.message !== 'string') return { data: null, error: 'Release availability could not be verified.' };
    return { data, error: null };
  } catch { return { data: null, error: 'Unable to check this week’s meals. Check your connection.' }; }
}
export async function fetchWeeklyMeals(ownerId: string): Promise<ServiceResult<WeeklyRelease>> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return { data: null, error: 'Weekly membership meals are available in the installed mobile app.' };
  const result = await invokeBilling<{ release: WeeklyRelease }>('app-weekly-meals', { action: 'read', platform: Platform.OS }, ownerId);
  if (result.error || !result.data) return { data: null, error: result.error };
  const candidate = result.data.release;
  if (!candidate || (candidate.environment !== 'live' && candidate.environment !== 'test')) return { data: null, error: 'The weekly meal response could not be verified.' };
  const release = validateWeeklyRelease(candidate, candidate.environment);
  if (!release) return { data: null, error: 'The current weekly recipe collection could not be verified.' };
  return { data: { id: release.id, week_of: release.week_of, environment: release.environment, title: release.title, summary: release.summary, meals: release.meals }, error: null };
}
export function weeklyGroceries(meals: WeeklyRecipe[], servings: Record<string, number>, choices: Record<string, string> = {}) {
  return buildWeeklyGroceries(meals, servings, choices);
}
