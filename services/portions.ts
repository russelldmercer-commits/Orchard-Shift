import { Plate } from './content';

export type WeightUnit = 'kg' | 'lb';
export interface PortionProfile { age: number | null; weightKg: number | null; weightUnit: WeightUnit; adultReferenceConfirmed: boolean }
export const emptyPortionProfile: PortionProfile = { age: null, weightKg: null, weightUnit: 'kg', adultReferenceConfirmed: false };
export const servingLimits = { min: 0.25, max: 8, step: 0.25 };
export const portionSources = {
  protein: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5347101/',
  plate: 'https://www.myplate.gov/eat-healthy/what-is-myplate',
  personalized: 'https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator',
};
export function normalizeServings(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.min(servingLimits.max, Math.max(servingLimits.min, Math.round(number / servingLimits.step) * servingLimits.step));
}
export function formatQuantity(value: number): string {
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}
export function scalePlate(plate: Plate, servings: number): Plate {
  const amount = normalizeServings(servings);
  return { ...plate, kcal: Math.round(plate.kcal * amount), protein: Math.round(plate.protein * amount * 10) / 10, fiber: Math.round(plate.fiber * amount * 10) / 10, ingredients: plate.ingredients.map(item => ({ ...item, quantity: item.quantity * amount })) };
}
export function normalizePortionProfile(value: unknown): PortionProfile {
  if (!value || typeof value !== 'object') return { ...emptyPortionProfile };
  const profile = value as Partial<PortionProfile>;
  const age = typeof profile.age === 'number' && Number.isInteger(profile.age) && profile.age >= 1 && profile.age <= 120 ? profile.age : null;
  const weightKg = age !== null && age >= 19 && typeof profile.weightKg === 'number' && Number.isFinite(profile.weightKg) && profile.weightKg >= 20 && profile.weightKg <= 350 ? profile.weightKg : null;
  return { age, weightKg, weightUnit: profile.weightUnit === 'lb' ? 'lb' : 'kg', adultReferenceConfirmed: age !== null && age >= 19 && profile.adultReferenceConfirmed === true };
}
export function weightInKg(value: number, unit: WeightUnit): number { return unit === 'lb' ? value * 0.45359237 : value; }
export function weightForDisplay(weightKg: number, unit: WeightUnit): string { return formatQuantity(unit === 'lb' ? weightKg / 0.45359237 : weightKg); }
export function validatePortionProfile(ageText: string, weightText: string, unit: WeightUnit, confirmed: boolean): { profile?: PortionProfile; error: string } {
  if (!ageText.trim() && !weightText.trim()) return { profile: { ...emptyPortionProfile, weightUnit: unit }, error: '' };
  const age = Number(ageText.trim());
  if (!/^\d+$/.test(ageText.trim()) || !Number.isInteger(age) || age < 1 || age > 120) return { error: 'Enter age as a whole number from 1 to 120, or leave both fields empty.' };
  if (age < 19) return { profile: { age, weightKg: null, weightUnit: unit, adultReferenceConfirmed: false }, error: '' };
  if (!weightText.trim()) return { profile: { age, weightKg: null, weightUnit: unit, adultReferenceConfirmed: confirmed }, error: '' };
  const number = Number(weightText.trim().replace(',', '.'));
  const weightKg = weightInKg(number, unit);
  if (!Number.isFinite(number) || weightKg < 20 || weightKg > 350) return { error: `Enter a weight between ${unit === 'kg' ? '20 and 350 kg' : '44.1 and 771.6 lb'}. Outside this range, use individualized professional guidance.` };
  return { profile: { age, weightKg, weightUnit: unit, adultReferenceConfirmed: confirmed }, error: '' };
}
export function portionGuidance(profile: PortionProfile) {
  const age = profile.age;
  const isMinor = age !== null && age < 19;
  const isOlderAdult = age !== null && age >= 65;
  const dailyProtein = !isMinor && age !== null && profile.weightKg !== null && profile.adultReferenceConfirmed ? Math.round(0.8 * profile.weightKg * 10) / 10 : null;
  const ageAdvice = isMinor
    ? 'Under 19: growth changes nutrition needs. Do not use this adult weight-based reference or shrink meals to meet it. Ask a pediatric clinician or registered dietitian for age-appropriate portions.'
    : isOlderAdult
    ? 'Age 65+: do not automatically make portions smaller because of age. Appetite, muscle health, activity, and health conditions matter; protein needs can differ from this general adult reference. Discuss tailored portions with a registered dietitian.'
    : age !== null
    ? 'For adults, start with a balanced plate and adjust to hunger, fullness, activity, and your usual eating pattern. Age and weight alone do not determine an appropriate meal size.'
    : 'An optional age and weight profile adds age-aware guidance and a general adult protein reference. It never changes your portions automatically.';
  return { ageAdvice, isMinor, isOlderAdult, dailyProtein };
}
