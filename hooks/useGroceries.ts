import { useMemo, useState } from 'react';
import { groceryList, planKey } from '@/services/storage';
import { days, slots } from '@/services/content';
import { normalizeServings, formatQuantity } from '@/services/portions';
import { useOrchard } from './useOrchard';
export function useGroceries() {
  const orchard = useOrchard();
  const [week,setWeek] = useState(0);
  const items = useMemo(() => groceryList(orchard.data.plan,week,orchard.data.mealServings).map(item => ({ ...item, quantityLabel: formatQuantity(item.quantity) })),[orchard.data.plan,orchard.data.mealServings,week]);
  const totalServings = useMemo(() => formatQuantity(days.reduce((total,_,day) => total + slots.reduce((amount,slot) => amount + normalizeServings(orchard.data.mealServings[planKey(week,day,slot)]),0),0)),[orchard.data.mealServings,week]);
  const checked = items.filter(item => orchard.data.groceriesChecked[item.key]).length;
  return { ...orchard, items,week,setWeek,checked,totalServings };
}
