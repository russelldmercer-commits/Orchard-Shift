import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useWeeklyMeals } from './useWeeklyMeals';
import { useOrchard } from './useOrchard';
import { rankWeeklyOptions, selectedWeeklyMeals, weeklyGroceries, weeklyPreferenceMatches, weeklySlots } from '@/services/weeklyMealPlan';
export function useWeeklyMealScreen() {
  const state = useWeeklyMeals(); const { user } = useAuth(); const { data } = useOrchard(); const router = useRouter();
  const [day, setDayValue] = useState(() => (new Date().getDay() + 6) % 7);
  const [shopping, setShopping] = useState(false); const [expanded, setExpanded] = useState('');
  useFocusEffect(useCallback(() => {
    void state.refresh();
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void state.refresh(); });
    return () => subscription.remove();
  }, [state.refresh]));
  useEffect(() => { setExpanded(''); }, [user?.id, state.release?.id]);
  const planned = useMemo(() => selectedWeeklyMeals(state.release?.meals ?? [], state.choices), [state.release, state.choices]);
  const meals = useMemo(() => weeklySlots.flatMap(slot => {
    const reference = planned.find(meal => meal.day === day && meal.slot === slot); if (!reference || !state.release) return [];
    const options = rankWeeklyOptions(reference, state.release.meals, data.preferences);
    return options.map(meal => ({ meal, selected: meal.id === reference.id, optionsCount: options.length, ...weeklyPreferenceMatches(meal, data.preferences) }));
  }), [state.release, planned, day, data.preferences]);
  const groceries = useMemo(() => weeklyGroceries(state.release?.meals ?? [], state.servings, state.choices), [state.release, state.servings, state.choices]);
  const checkedCount = useMemo(() => groceries.filter(item => state.checked[item.key]).length, [groceries, state.checked]);
  const setDay = useCallback((value: number) => { if (Number.isInteger(value) && value >= 0 && value <= 6) { setDayValue(value); setExpanded(''); } }, []);
  const openMembership = useCallback(() => router.push('/membership'), [router]);
  const signIn = useCallback(() => router.push('/login'), [router]);
  const openPreferences = useCallback(() => router.push('/(tabs)/you'), [router]);
  const openSupport = useCallback(() => router.push('/support'), [router]);
  const toggleExpanded = useCallback((id: string) => setExpanded(current => current === id ? '' : id), []);
  const chooseRecipe = useCallback((id: string) => { state.selectMeal(id); setExpanded(id); }, [state.selectMeal]);
  return { ...state, user, day, setDay, shopping, setShopping, expanded, toggleExpanded, meals, groceries, checkedCount, plannedCount: planned.filter(meal => meal.day === day).length, openMembership, signIn, openPreferences, openSupport, chooseRecipe };
}
