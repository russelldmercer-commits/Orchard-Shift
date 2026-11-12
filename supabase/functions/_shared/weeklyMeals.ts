// Pure publication validation shared by production and offline tests.
export interface WeeklyRecipe {
  id: string; day: number; slot: 'Breakfast' | 'Lunch' | 'Dinner'; name: string;
  style: string; description: string; minutes: number; kcal: number; protein: number; fiber: number;
  ingredients: { name: string; quantity: number; unit: string }[]; steps: string[];
}
export interface WeeklyRelease { id: string; week_of: string; environment: 'live' | 'test'; title: string; summary: string; reviewed_by: string; reviewed_at: string; published_at: string; meals: WeeklyRecipe[] }
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/sk_|sb_secret_|eyJ[\w-]+\.[\w-]+\.[\w-]+/i.test(value);
}
function number(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
export function weekStart(now: number): string {
  const date = new Date(now); date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function validateWeeklyRelease(value: unknown, environment: 'live' | 'test', now = Date.now()): WeeklyRelease | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    if (!text(row.id, 100) || row.week_of !== weekStart(now) || row.environment !== environment || !text(row.title, 100) || !text(row.summary, 500) || !text(row.reviewed_by, 100)) return null;
    const published = typeof row.published_at === 'string' ? Date.parse(row.published_at) : NaN;
    const reviewed = typeof row.reviewed_at === 'string' ? Date.parse(row.reviewed_at) : NaN;
    if (!Number.isFinite(published) || !Number.isFinite(reviewed) || published > now || reviewed > published) return null;
    if (!Array.isArray(row.meals) || row.meals.length < 21 || row.meals.length > 42 || JSON.stringify(row.meals).length > 90000) return null;
    const ids = new Set<string>(); const slots = new Set<string>();
    const meals: WeeklyRecipe[] = [];
    for (const raw of row.meals) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const m = raw as Record<string, unknown>;
      if (!text(m.id, 100) || ids.has(m.id) || !number(m.day, 0, 6) || !Number.isInteger(m.day) || !['Breakfast', 'Lunch', 'Dinner'].includes(String(m.slot)) || typeof m.slot !== 'string') return null;
      if (!text(m.name, 120) || !text(m.style, 80) || !text(m.description, 500) || !number(m.minutes, 1, 240) || !number(m.kcal, 100, 1500) || !number(m.protein, 0, 150) || !number(m.fiber, 0, 60)) return null;
      if (!Array.isArray(m.ingredients) || m.ingredients.length < 2 || m.ingredients.length > 20 || !Array.isArray(m.steps) || m.steps.length < 1 || m.steps.length > 12) return null;
      const ingredients: WeeklyRecipe['ingredients'] = [];
      for (const item of m.ingredients) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || !text(item.name, 100) || !number(item.quantity, 0.01, 5000) || !text(item.unit, 30)) return null;
        ingredients.push({ name: item.name, quantity: item.quantity, unit: item.unit });
      }
      if (m.steps.some((step: unknown) => !text(step, 700))) return null;
      ids.add(m.id); slots.add(`${m.day}-${m.slot}`);
      meals.push({ id: m.id, day: m.day, slot: m.slot as WeeklyRecipe['slot'], name: m.name, style: m.style, description: m.description, minutes: m.minutes, kcal: m.kcal, protein: m.protein, fiber: m.fiber, ingredients, steps: [...m.steps] });
    }
    if (slots.size !== 21) return null;
    return { id: row.id, week_of: row.week_of as string, environment, title: row.title, summary: row.summary, reviewed_by: row.reviewed_by, reviewed_at: row.reviewed_at as string, published_at: row.published_at as string, meals };
  } catch { return null; }
}
