import { useContext } from 'react';
import { WeeklyMealsContext } from '@/contexts/WeeklyMealsContext';
export function useWeeklyMeals() {
  const state = useContext(WeeklyMealsContext);
  if (!state) throw new Error('useWeeklyMeals must be used within WeeklyMealsProvider');
  return state;
}
