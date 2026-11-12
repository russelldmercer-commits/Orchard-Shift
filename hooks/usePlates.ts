import { useCallback, useEffect, useMemo, useState } from 'react';
import { plates, foodStyles, getPlate, Slot } from '@/services/content';
import { alternatives, dislikesIn, swapIdeas, terms, planKey } from '@/services/storage';
import { formatQuantity, normalizeServings, scalePlate } from '@/services/portions';
import { useOrchard } from './useOrchard';
export function usePlates() {
  const { data } = useOrchard();
  const [style,setStyle] = useState('All styles');
  const [query,setQuery] = useState('');
  const filtered = useMemo(() => plates.filter(p => (style === 'All styles' || p.style === style) && `${p.name} ${p.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())),[style,query]);
  return { filtered,style,setStyle,query,setQuery,foodStyles,preferences: data.preferences };
}
interface PlateTarget { week?: string; day?: string; slot?: Slot }
export function usePlateDetail(id: string, target: PlateTarget = {}) {
  const orchard = useOrchard();
  const [selectedId,setSelectedId] = useState(id);
  const [week,setWeek] = useState(target.week === '1' ? 1 : 0);
  const [day,setDay] = useState(target.day !== undefined ? Math.min(6,Math.max(0,Math.floor(Number(target.day) || 0))) : (new Date().getDay()+6)%7);
  const [slot,setSlot] = useState<Slot>(target.slot === 'Dinner' ? 'Dinner' : 'Lunch');
  const [servings,setServingsState] = useState(1);
  const basePlate = getPlate(selectedId);
  const actualSlot: Slot = basePlate.slot === 'Breakfast' ? 'Breakfast' : slot;
  const mealKey = planKey(week,day,actualSlot);
  useEffect(() => { setSelectedId(id); },[id]);
  useEffect(() => {
    if (orchard.ready) setServingsState(normalizeServings(orchard.data.mealServings[mealKey]));
  },[orchard.ready,orchard.data.mealServings,mealKey]);
  const setServings = useCallback((value: number) => setServingsState(normalizeServings(value)),[]);
  const plate = useMemo(() => scalePlate(basePlate,servings),[basePlate,servings]);
  const ingredients = useMemo(() => plate.ingredients.map(item => ({ ...item, quantityLabel: formatQuantity(item.quantity) })),[plate]);
  const options = useMemo(() => alternatives(basePlate,plates,orchard.data.preferences).map(option => scalePlate(option,servings)),[basePlate,orchard.data.preferences,servings]);
  const swaps = useMemo(() => dislikesIn(basePlate,orchard.data.preferences).map(name => ({ name, ideas: swapIdeas(name).filter(idea => !terms(orchard.data.preferences.dislikes).some(term => idea.toLowerCase().includes(term))) })),[basePlate,orchard.data.preferences]);
  const select = useCallback(() => orchard.chooseMeal(week,day,actualSlot,basePlate.id,servings),[orchard.chooseMeal,week,day,actualSlot,basePlate.id,servings]);
  return { plate, ingredients, options, swaps, setSelectedId, select, week,setWeek,day,setDay,actualSlot,setSlot,servings,setServings, ready: orchard.ready };
}
