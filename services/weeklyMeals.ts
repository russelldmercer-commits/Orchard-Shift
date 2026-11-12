import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';
import { invokeBilling, type ServiceResult } from './membership';
export interface ReleaseInformation { legalName: string; supportEmail: string; privacyUrl: string; termsUrl: string; supportUrl: string; deletionUrl: string }
export interface ReleaseAvailability { ready: boolean; weekOf: string | null; title: string | null; information: ReleaseInformation | null; message: string }
export interface WeeklyRecipe { id: string; day: number; slot: 'Breakfast' | 'Lunch' | 'Dinner'; name: string; style: string; description: string; minutes: number; kcal: number; protein: number; fiber: number; ingredients: { name: string; quantity: number; unit: string }[]; steps: string[] }
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
  const release = result.data.release;
  if (!release || !Array.isArray(release.meals) || release.meals.length < 21 || !['live', 'test'].includes(release.environment)) return { data: null, error: 'The weekly meal response could not be verified.' };
  return { data: release, error: null };
}
export function weeklyGroceries(meals: WeeklyRecipe[], servings: Record<string, number>) {
  const totals = new Map<string, { key: string; name: string; unit: string; quantity: number }>();
  // The first recipe per day/slot is the base plan; duplicate slots are optional alternatives.
  const slots = new Set<string>();
  for (const meal of meals) {
    const slot = `${meal.day}-${meal.slot}`; if (slots.has(slot)) continue; slots.add(slot);
    for (const item of meal.ingredients) {
      const key = `${item.name.toLowerCase()}|${item.unit}`;
      const existing = totals.get(key) ?? { key, name: item.name, unit: item.unit, quantity: 0 };
      existing.quantity += item.quantity * (servings[meal.id] ?? 1); totals.set(key, existing);
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
}
