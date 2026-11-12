import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useWeeklyMeals } from './useWeeklyMeals';
import { weeklyGroceries } from '@/services/weeklyMeals';
export function useWeeklyMealScreen() {
  const state = useWeeklyMeals(); const { user } = useAuth(); const router = useRouter();
  const [day, setDay] = useState(0); const [shopping, setShopping] = useState(false); const [expanded, setExpanded] = useState('');
  useFocusEffect(useCallback(() => {
    void state.refresh();
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void state.refresh(); });
    return () => subscription.remove();
  }, [state.refresh]));
  const meals = useMemo(() => state.release?.meals.filter(meal => meal.day === day) ?? [], [state.release, day]);
  const groceries = useMemo(() => weeklyGroceries(state.release?.meals ?? [], state.servings), [state.release, state.servings]);
  const openMembership = useCallback(() => router.push('/membership'), [router]);
  const signIn = useCallback(() => router.push('/login'), [router]);
  const toggleExpanded = useCallback((id: string) => setExpanded(current => current === id ? '' : id), []);
  return { ...state, user, day, setDay, shopping, setShopping, expanded, toggleExpanded, meals, groceries, openMembership, signIn };
}
