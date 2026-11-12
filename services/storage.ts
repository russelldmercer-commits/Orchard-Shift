import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlate, initialPlan, slots, days, Plate, Slot, Ingredient } from './content';
import { emptyPortionProfile, normalizePortionProfile, normalizeServings, PortionProfile } from './portions';
export interface Preferences { likes: string; dislikes: string; styles: string[] }
export interface DeviceData { version: number; preferences: Preferences; portionProfile: PortionProfile; plan: Record<string,string>; mealServings: Record<string,number>; completedLessons: string[]; reflections: Record<string,string>; groceriesChecked: Record<string,boolean>; mealCompleted: Record<string,boolean> }
export const defaultData: DeviceData = { version: 2, preferences: { likes: '', dislikes: '', styles: [] }, portionProfile: { ...emptyPortionProfile }, plan: { ...initialPlan(0), ...initialPlan(1) }, mealServings: {}, completedLessons: [], reflections: {}, groceriesChecked: {}, mealCompleted: {} };
const key = 'orchard-shift-device-v1';
export async function loadDeviceData(): Promise<DeviceData> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return defaultData;
  const saved = JSON.parse(raw);
  const mealServings = Object.fromEntries(Object.entries(saved.mealServings ?? {}).map(([mealKey, value]) => [mealKey, normalizeServings(value)]));
  return { ...defaultData, ...saved, version: 2, preferences: { ...defaultData.preferences, ...saved.preferences }, plan: { ...defaultData.plan, ...saved.plan }, mealServings, portionProfile: normalizePortionProfile(saved.portionProfile) };
}
export async function saveDeviceData(data: DeviceData): Promise<void> { await AsyncStorage.setItem(key, JSON.stringify(data)); }
export const terms = (value: string) => value.toLowerCase().split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
export const dislikesIn = (plate: Plate, prefs: Preferences) => plate.ingredients.filter(i => terms(prefs.dislikes).some(t => i.name.toLowerCase().includes(t))).map(i => i.name);
export function alternatives(plate: Plate, choices: Plate[], prefs: Preferences): Plate[] {
  return choices.filter(p => p.id !== plate.id && p.slot === plate.slot).sort((a,b) => {
    const score = (p: Plate) => Math.abs(p.kcal - plate.kcal) / plate.kcal + Math.abs(p.protein - plate.protein) / plate.protein + Math.abs(p.fiber - plate.fiber) / plate.fiber + dislikesIn(p,prefs).length * 3 - (prefs.styles.includes(p.style) ? 0.15 : 0) - (terms(prefs.likes).some(t => p.ingredients.some(i => i.name.includes(t))) ? 0.1 : 0);
    return score(a) - score(b);
  });
}
const swaps: Record<string,string[]> = { 'firm tofu': ['cooked chickpeas','cooked white beans'], 'chicken breast': ['firm tofu','cooked chickpeas'], 'salmon': ['chicken breast','firm tofu'], 'eggs': ['firm tofu','cooked chickpeas'], 'plain Greek yogurt': ['plain high-protein soy yogurt','unsweetened dairy-free yogurt'], 'almonds': ['pumpkin seeds','sunflower seeds'], 'peanut butter': ['sunflower seed butter','tahini'], 'tahini': ['sunflower seed butter','plain Greek yogurt'], 'spinach': ['kale','broccoli'], 'broccoli': ['green beans','zucchini'], 'tomatoes': ['bell peppers','zucchini'], 'cooked brown rice': ['cooked quinoa','cooked barley'], 'cooked quinoa': ['cooked brown rice','cooked bulgur'], 'cooked barley': ['cooked brown rice','cooked quinoa'], 'whole-grain bread': ['whole-grain gluten-free bread','cooked brown rice'], 'cooked lentils': ['cooked chickpeas','cooked white beans'], 'cooked chickpeas': ['cooked white beans','cooked lentils'], 'cooked black beans': ['cooked lentils','cooked white beans'], 'avocado': ['olive oil','tahini'], 'berries': ['apple','pear'], 'cabbage': ['cucumber','carrots'] };
export function swapIdeas(name: string): string[] { return swaps[name] ?? ['another vegetable, grain, or protein with a similar role','a different complete meal from the alternatives']; }
export interface GroceryItem extends Ingredient { key: string }
export function groceryList(plan: Record<string,string>, week: number, mealServings: Record<string,number> = {}): GroceryItem[] {
  const totals: Record<string,GroceryItem> = {};
  days.forEach((_,day) => slots.forEach(slot => { const mealKey = planKey(week,day,slot); const plate = getPlate(plan[mealKey]); const servings = normalizeServings(mealServings[mealKey]); plate.ingredients.forEach(item => { const itemKey = `${item.name}-${item.unit}`; if (!totals[itemKey]) totals[itemKey] = { ...item, quantity: 0, key: `${week}-${itemKey}` }; totals[itemKey].quantity += item.quantity * servings; }); }));
  return Object.values(totals).sort((a,b) => a.name.localeCompare(b.name));
}
export const planKey = (week: number, day: number, slot: Slot) => `${week}-${day}-${slot}`;
