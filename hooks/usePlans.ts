import { useMemo, useState } from 'react';
import { days, slots, getPlate, lessons } from '@/services/content';
import { planKey } from '@/services/storage';
import { normalizeServings, scalePlate } from '@/services/portions';
import { useOrchard } from './useOrchard';
export function usePlans() {
  const orchard = useOrchard();
  const [week,setWeek] = useState(0);
  const [day,setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [weekly,setWeekly] = useState(false);
  const meals = useMemo(() => slots.map(slot => {
    const key = planKey(week,day,slot);
    const servings = normalizeServings(orchard.data.mealServings[key]);
    return { slot, key, servings, plate: scalePlate(getPlate(orchard.data.plan[key]),servings), completed: Boolean(orchard.data.mealCompleted[key]) };
  }),[week,day,orchard.data]);
  const weekDays = useMemo(() => days.map((name,index) => ({ name, day: index, meals: slots.map(slot => {
    const key = planKey(week,index,slot);
    const servings = normalizeServings(orchard.data.mealServings[key]);
    return { slot, key, servings, plate: scalePlate(getPlate(orchard.data.plan[key]),servings) };
  }) })),[week,orchard.data.plan,orchard.data.mealServings]);
  const nextLesson = lessons.find(l => !orchard.data.completedLessons.includes(l.id)) ?? lessons[0];
  return { ...orchard, week,setWeek,day,setDay,weekly,setWeekly,meals,weekDays,nextLesson,completedCount: orchard.data.completedLessons.length, mealCount: meals.filter(m => m.completed).length };
}
