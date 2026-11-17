// Pure device-side planning. No authentication, storage, networking or medical claims.
export interface WeeklyRecipe {
  id: string; day: number; slot: 'Breakfast' | 'Lunch' | 'Dinner'; name: string;
  style: string; description: string; minutes: number; kcal: number; protein: number; fiber: number;
  ingredients: { name: string; quantity: number; unit: string }[]; steps: string[];
}
export interface WeeklyPreferences { likes: string; dislikes: string; styles: string[] }
export interface WeeklyGrocery { key: string; name: string; unit: string; quantity: number }
export const weeklySlots: WeeklyRecipe['slot'][] = ['Breakfast', 'Lunch', 'Dinner'];
export const weeklySlotKey = (meal: Pick<WeeklyRecipe, 'day' | 'slot'>): string => `${meal.day}-${meal.slot}`;
export function weeklyServingAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.25, Math.min(8, Math.round(value * 4) / 4)) : 1;
}
export function selectedWeeklyMeals(meals: WeeklyRecipe[], choices: Record<string, string> = {}): WeeklyRecipe[] {
  const groups = new Map<string, WeeklyRecipe[]>();
  for (const meal of meals) {
    const key = weeklySlotKey(meal);
    const group = groups.get(key) ?? []; group.push(meal); groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => group.find(meal => meal.id === choices[key]) ?? group[0]);
}
export function weeklyGroceries(meals: WeeklyRecipe[], servings: Record<string, number>, choices: Record<string, string> = {}): WeeklyGrocery[] {
  const totals = new Map<string, WeeklyGrocery>();
  for (const meal of selectedWeeklyMeals(meals, choices)) {
    const amount = weeklyServingAmount(servings[meal.id]);
    for (const item of meal.ingredients) {
      const name = item.name.trim(); const unit = item.unit.trim();
      const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
      const total = totals.get(key) ?? { key, name, unit, quantity: 0 };
      total.quantity += item.quantity * amount; totals.set(key, total);
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function terms(value: string): string[] { return value.toLowerCase().split(/[,;\n]/).map(term => term.trim()).filter(Boolean); }
export function weeklyPreferenceMatches(meal: WeeklyRecipe, preferences: WeeklyPreferences): { liked: string[]; disliked: string[] } {
  const match = (value: string) => meal.ingredients.filter(item => terms(value).some(term => item.name.toLowerCase().includes(term))).map(item => item.name);
  return { liked: match(preferences.likes), disliked: match(preferences.dislikes) };
}
export function rankWeeklyOptions(reference: WeeklyRecipe, meals: WeeklyRecipe[], preferences: WeeklyPreferences): WeeklyRecipe[] {
  const style = (value: string) => value.toLowerCase().replace(/-inspired$/, '');
  const score = (meal: WeeklyRecipe) => {
    const matches = weeklyPreferenceMatches(meal, preferences);
    return Math.abs(meal.kcal - reference.kcal) / Math.max(1, reference.kcal) +
      Math.abs(meal.protein - reference.protein) / Math.max(1, reference.protein) +
      Math.abs(meal.fiber - reference.fiber) / Math.max(1, reference.fiber) +
      matches.disliked.length * 3 - (matches.liked.length ? 0.1 : 0) -
      (preferences.styles.some(value => style(value) === style(meal.style)) ? 0.15 : 0);
  };
  return meals.filter(meal => meal.day === reference.day && meal.slot === reference.slot)
    .map((meal, index) => ({ meal, index, score: meal.id === reference.id ? -Infinity : score(meal) }))
    .sort((a, b) => a.score - b.score || a.index - b.index).map(item => item.meal);
}
