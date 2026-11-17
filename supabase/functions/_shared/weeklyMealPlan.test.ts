import { selectedWeeklyMeals, weeklyGroceries, weeklySlotKey, weeklyServingAmount, weeklyPreferenceMatches, rankWeeklyOptions, type WeeklyRecipe } from '../../../services/weeklyMealPlan.ts';
const empty = { likes: '', dislikes: '', styles: [] };
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function recipe(id: string, day = 0, slot: WeeklyRecipe['slot'] = 'Lunch', ingredient = 'cooked beans'): WeeklyRecipe {
  return { id, day, slot, name: `Synthetic ${id}`, description: 'Offline fixture only', style: 'Everyday', minutes: 20, kcal: 500, protein: 25, fiber: 10, ingredients: [{ name: ingredient, quantity: 100, unit: 'g' }, { name: 'rice', quantity: 50, unit: 'g' }], steps: ['Fixture instruction.'] };
}
function test(name: string, fn: () => void) { Deno.test({ name, permissions: { net: false, env: false, read: false, write: false, run: false }, fn }); }
test('weekly choices use one published recipe per day and slot', () => {
  const meals = [recipe('base'), recipe('alternate', 0, 'Lunch', 'lentils'), recipe('dinner', 0, 'Dinner'), recipe('tomorrow', 1)];
  const choices = { [weeklySlotKey(meals[0])]: 'alternate' };
  const chosen = selectedWeeklyMeals(meals, choices);
  assert(chosen.length === 3 && chosen[0].id === 'alternate', 'Explicit choice replaces its slot only');
  assert(selectedWeeklyMeals(meals, { '0-Lunch': 'dinner' })[0].id === 'base', 'Another slot cannot be selected by ID');
  assert(selectedWeeklyMeals(meals, { '0-Lunch': 'missing' })[0].id === 'base', 'Stale recipe IDs fall back to the published base');
  assert(selectedWeeklyMeals([], choices).length === 0, 'No collection means no selected recipes');
});
test('shopping totals follow the chosen recipe and serving amount, not every alternative', () => {
  const meals = [recipe('base'), recipe('alternate', 0, 'Lunch', 'lentils'), recipe('dinner', 0, 'Dinner')];
  const totals = weeklyGroceries(meals, { alternate: 2, dinner: 0.5 }, { '0-Lunch': 'alternate' });
  assert(totals.find(item => item.name === 'lentils')?.quantity === 200, 'Selected alternative must scale');
  assert(totals.find(item => item.name === 'cooked beans')?.quantity === 50, 'Only dinner contributes beans');
  assert(totals.find(item => item.name === 'rice')?.quantity === 125, 'Shared ingredients must aggregate');
  assert(weeklyGroceries(meals, {}, { '0-Lunch': 'missing' }).find(item => item.name === 'cooked beans')?.quantity === 200, 'Unknown choices never add unknown recipes');
});
test('servings are bounded, finite and safe for inherited object keys', () => {
  for (const value of [NaN, Infinity, undefined, '2', {}]) assert(weeklyServingAmount(value) === 1, 'Malformed values use one serving');
  assert(weeklyServingAmount(0) === 0.25 && weeklyServingAmount(100) === 8 && weeklyServingAmount(1.12) === 1, 'Quarter servings must stay bounded');
  const totals = weeklyGroceries([recipe('constructor')], {});
  assert(totals.every(item => Number.isFinite(item.quantity)), 'Inherited names must not produce NaN totals');
});
test('ingredient units are not incorrectly merged', () => {
  const first = recipe('a'); const second = recipe('b', 0, 'Dinner');
  second.ingredients[0] = { name: 'cooked beans', quantity: 2, unit: 'cups' };
  const totals = weeklyGroceries([first, second], {});
  assert(totals.filter(item => item.name === 'cooked beans').length === 2, 'Grams and cups remain distinct');
});
test('preferences flag ingredients and rank only genuine alternatives without hiding them', () => {
  const current = recipe('current'); const disliked = recipe('tofu', 0, 'Lunch', 'firm tofu'); const liked = recipe('lentil', 0, 'Lunch', 'cooked lentils');
  const preferences = { likes: 'LENTILS', dislikes: 'tofu', styles: ['Everyday'] };
  assert(weeklyPreferenceMatches(disliked, preferences).disliked[0] === 'firm tofu', 'Specific disliked ingredients must be flagged');
  assert(weeklyPreferenceMatches(liked, preferences).liked[0] === 'cooked lentils', 'Case-insensitive preferences must match');
  const options = rankWeeklyOptions(current, [disliked, liked, current, recipe('other-day', 1)], preferences);
  assert(options.length === 3 && options[0].id === 'current' && options[1].id === 'lentil', 'Selection stays first; likes guide same-slot alternatives');
  assert(options.some(meal => meal.id === 'tofu'), 'Preference flags are not allergy filtering or censorship');
  assert(rankWeeklyOptions(current, [current], empty).length === 1, 'Do not invent additional published meals');
});
