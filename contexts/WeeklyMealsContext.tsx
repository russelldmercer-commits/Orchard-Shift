import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/template';
import { useMembership } from '@/hooks/useMembership';
import { canViewWeeklyContent } from '@/services/weeklyAccess';
import { fetchWeeklyMeals, fetchReleaseAvailability, type WeeklyRelease, type ReleaseAvailability } from '@/services/weeklyMeals';
import { selectedWeeklyMeals, weeklySlotKey, weeklyServingAmount, weeklyGroceries } from '@/services/weeklyMealPlan';
export interface WeeklyMealsState {
  release: WeeklyRelease | null; availability: ReleaseAvailability | null; error: string; loading: boolean;
  servings: Record<string, number>; choices: Record<string, string>; checked: Record<string, boolean>;
  refresh: () => Promise<void>; setServings: (id: string, amount: number) => void;
  selectMeal: (id: string) => void; toggleGrocery: (key: string) => void; clearChecklist: () => void;
}
interface WeeklyPlan { scope: string | null; servings: Record<string, number>; choices: Record<string, string>; checked: Record<string, boolean> }
const emptyPlan = (): WeeklyPlan => ({ scope: null, servings: {}, choices: {}, checked: {} });
export const WeeklyMealsContext = createContext<WeeklyMealsState | undefined>(undefined);
export function WeeklyMealsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth(); const membership = useMembership();
  const ownerId = user?.id ?? null;
  const owner = useRef(ownerId); const generation = useRef(0); const mounted = useRef(true);
  if (owner.current !== ownerId) { owner.current = ownerId; generation.current++; }
  const [clock, setClock] = useState(Date.now);
  const [state, setState] = useState<{ ownerId: string | null; release: WeeklyRelease | null; availability: ReleaseAvailability | null; error: string; loading: boolean }>({ ownerId: null, release: null, availability: null, error: '', loading: false });
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null; let stopped = false;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    const tick = () => {
      clear(); if (stopped || (AppState.currentState && AppState.currentState !== 'active')) return;
      const now = Date.now(); setClock(now);
      const boundaries = [Date.parse(membership.status?.subscription_end ?? ''), Date.parse(membership.checkedAt ?? '') + 90000].filter(value => Number.isFinite(value) && value > now);
      timer = setTimeout(tick, Math.max(1, Math.min(30000, ...boundaries.map(value => value - now + 1))));
    };
    tick(); const subscription = AppState.addEventListener('change', next => { clear(); if (next === 'active') tick(); });
    return () => { stopped = true; clear(); subscription.remove(); };
  }, [membership.status?.subscription_end, membership.checkedAt]);
  const now = Math.max(clock, Date.now());
  const mayRead = Boolean(ownerId && !authLoading && canViewWeeklyContent(membership.status, membership.status?.billing_mode ?? 'live', membership.checkedAt, now));
  const access = useRef(mayRead);
  if (access.current && !mayRead) generation.current++;
  access.current = mayRead;
  useEffect(() => {
    setPlan(emptyPlan());
    setState(previous => previous.ownerId === ownerId ? previous : { ownerId, release: null, availability: null, error: '', loading: false });
  }, [ownerId]);
  useEffect(() => {
    if (!mayRead) {
      setPlan(emptyPlan());
      setState(previous => previous.release ? { ...previous, release: null, loading: false } : previous);
    }
  }, [mayRead]);
  const refresh = useCallback(async () => {
    if (authLoading) return;
    const version = ++generation.current;
    setState(previous => ({ ...previous, ownerId, release: previous.ownerId === ownerId && access.current ? previous.release : null, error: '', loading: true }));
    try {
      const [availability, content] = await Promise.all([fetchReleaseAvailability(), ownerId && mayRead ? fetchWeeklyMeals(ownerId) : Promise.resolve({ data: null, error: null })]);
      if (!mounted.current || owner.current !== ownerId || generation.current !== version) return;
      setState({ ownerId, release: access.current ? content.data : null, availability: availability.data, error: content.error ?? availability.error ?? '', loading: false });
    } catch {
      if (mounted.current && owner.current === ownerId && generation.current === version) setState(previous => ({ ...previous, release: null, error: 'Weekly meals could not be verified. Check your connection and membership status.', loading: false }));
    }
  }, [ownerId, authLoading, mayRead]);
  const owned = state.ownerId === ownerId;
  const date = new Date(now); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const candidate = state.release;
  const release = owned && mayRead && candidate && candidate.week_of === date.toISOString().slice(0, 10) && canViewWeeklyContent(membership.status, candidate.environment, membership.checkedAt, now) ? candidate : null;
  const scope = release ? `${ownerId}|${release.environment}|${release.week_of}|${release.id}` : null;
  const currentScope = useRef(scope); currentScope.current = scope;
  const currentPlan = scope && plan.scope === scope ? plan : emptyPlan();
  const selectMeal = useCallback((id: string) => {
    if (!release || !scope || currentScope.current !== scope || !access.current || owner.current !== ownerId) return;
    const meal = release.meals.find(item => item.id === id); if (!meal) return;
    setPlan(previous => {
      const current = previous.scope === scope ? previous : { ...emptyPlan(), scope };
      if (selectedWeeklyMeals(release.meals, current.choices).some(item => item.id === id)) return current;
      return { ...current, choices: { ...current.choices, [weeklySlotKey(meal)]: id }, checked: {} };
    });
  }, [release, scope, ownerId]);
  const setServings = useCallback((id: string, amount: number) => {
    if (!Number.isFinite(amount) || !release || !scope || currentScope.current !== scope || !access.current || !release.meals.some(item => item.id === id)) return;
    setPlan(previous => {
      const current = previous.scope === scope ? previous : { ...emptyPlan(), scope };
      const value = weeklyServingAmount(amount); if (weeklyServingAmount(current.servings[id]) === value) return current;
      const selected = selectedWeeklyMeals(release.meals, current.choices).some(item => item.id === id);
      return { ...current, servings: { ...current.servings, [id]: value }, checked: selected ? {} : current.checked };
    });
  }, [release, scope]);
  const toggleGrocery = useCallback((key: string) => {
    if (!release || !scope || currentScope.current !== scope || !access.current) return;
    setPlan(previous => {
      const current = previous.scope === scope ? previous : { ...emptyPlan(), scope };
      if (!weeklyGroceries(release.meals, current.servings, current.choices).some(item => item.key === key)) return current;
      return { ...current, checked: { ...current.checked, [key]: !current.checked[key] } };
    });
  }, [release, scope]);
  const clearChecklist = useCallback(() => {
    if (scope && currentScope.current === scope && access.current) setPlan(previous => previous.scope === scope ? { ...previous, checked: {} } : previous);
  }, [scope]);
  return <WeeklyMealsContext.Provider value={{ release, availability: state.availability, error: owned ? state.error || (user ? membership.error : '') : '', loading: (owned && state.loading) || Boolean(user && membership.checking && !membership.status), servings: currentPlan.servings, choices: currentPlan.choices, checked: currentPlan.checked, refresh, setServings, selectMeal, toggleGrocery, clearChecklist }}>{children}</WeeklyMealsContext.Provider>;
}
