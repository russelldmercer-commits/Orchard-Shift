import { createContext, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { defaultData, DeviceData, loadDeviceData, saveDeviceData, Preferences, planKey } from '@/services/storage';
import { Slot } from '@/services/content';
import { normalizePortionProfile, normalizeServings, PortionProfile } from '@/services/portions';
interface OrchardContextType { eraseDeviceData: () => Promise<void>; data: DeviceData; ready: boolean; storageError: string; setPreferences: (prefs: Preferences) => void; setPortionProfile: (profile: PortionProfile) => void; chooseMeal: (week: number, day: number, slot: Slot, id: string, servings?: number) => void; setMealServings: (key: string, servings: number) => void; toggleLesson: (id: string) => void; saveReflection: (id: string, note: string) => void; toggleGrocery: (key: string) => void; toggleMeal: (key: string) => void }
export const OrchardContext = createContext<OrchardContextType | undefined>(undefined);
export function OrchardProvider({ children }: { children: ReactNode }) {
  const [data,setData] = useState<DeviceData>(defaultData);
  const [ready,setReady] = useState(false);
  const [storageError,setStorageError] = useState('');
  const queue = useRef(Promise.resolve());
  const storageEpoch = useRef(0);
  useEffect(() => { let active = true; loadDeviceData().then(value => { if(active) setData(value); }).catch(() => { if(active) setStorageError('Saved data could not be loaded. Changes are held in this session.'); }).finally(() => { if(active) setReady(true); }); return () => { active = false; }; },[]);
  useEffect(() => { if (!ready || storageError) return; const epoch = storageEpoch.current; queue.current = queue.current.then(() => epoch === storageEpoch.current ? saveDeviceData(data) : undefined).catch(() => setStorageError('Device storage is unavailable. Changes are held in this session only.')); },[data,ready,storageError]);
  const eraseDeviceData = useCallback(async () => {
    storageEpoch.current += 1;
    setData(defaultData);
    await queue.current;
    try { await saveDeviceData(defaultData); setStorageError(''); }
    catch { setStorageError('Device data could not be erased. Clear app data in device settings.'); throw new Error('local_erasure_failed'); }
  }, []);
  const setPreferences = useCallback((preferences: Preferences) => setData(d => ({ ...d, preferences })),[]);
  const setPortionProfile = useCallback((profile: PortionProfile) => setData(d => ({ ...d, portionProfile: normalizePortionProfile(profile) })),[]);
  const chooseMeal = useCallback((week: number,day: number,slot: Slot,id: string,servings?: number) => setData(d => {
    const key = planKey(week,day,slot);
    const amount = normalizeServings(servings ?? d.mealServings[key]);
    if (d.plan[key] === id && normalizeServings(d.mealServings[key]) === amount) return d;
    return { ...d, plan: { ...d.plan, [key]: id }, mealServings: { ...d.mealServings, [key]: amount }, mealCompleted: { ...d.mealCompleted, [key]: false }, groceriesChecked: Object.fromEntries(Object.entries(d.groceriesChecked).filter(([k]) => !k.startsWith(`${week}-`))) };
  }),[]);
  const setMealServings = useCallback((key: string,servings: number) => setData(d => {
    const amount = normalizeServings(servings);
    if (!d.plan[key] || normalizeServings(d.mealServings[key]) === amount) return d;
    const week = key.split('-')[0];
    return { ...d, mealServings: { ...d.mealServings, [key]: amount }, mealCompleted: { ...d.mealCompleted, [key]: false }, groceriesChecked: Object.fromEntries(Object.entries(d.groceriesChecked).filter(([k]) => !k.startsWith(`${week}-`))) };
  }),[]);
  const toggleLesson = useCallback((id: string) => setData(d => ({ ...d, completedLessons: d.completedLessons.includes(id) ? d.completedLessons.filter(i => i !== id) : [...d.completedLessons,id] })),[]);
  const saveReflection = useCallback((id: string,note: string) => setData(d => ({ ...d, reflections: { ...d.reflections, [id]: note } })),[]);
  const toggleGrocery = useCallback((key: string) => setData(d => ({ ...d, groceriesChecked: { ...d.groceriesChecked, [key]: !d.groceriesChecked[key] } })),[]);
  const toggleMeal = useCallback((key: string) => setData(d => ({ ...d, mealCompleted: { ...d.mealCompleted, [key]: !d.mealCompleted[key] } })),[]);
  return <OrchardContext.Provider value={{ eraseDeviceData,data,ready,storageError,setPreferences,setPortionProfile,chooseMeal,setMealServings,toggleLesson,saveReflection,toggleGrocery,toggleMeal }}>{children}</OrchardContext.Provider>;
}
