import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/template';
import { useMembership } from '@/hooks/useMembership';
import { canViewWeeklyContent } from '@/services/weeklyAccess';
import { fetchWeeklyMeals, fetchReleaseAvailability, type WeeklyRelease, type ReleaseAvailability } from '@/services/weeklyMeals';
export interface WeeklyMealsState { release: WeeklyRelease | null; availability: ReleaseAvailability | null; error: string; loading: boolean; servings: Record<string, number>; refresh: () => Promise<void>; setServings: (id: string, amount: number) => void }
export const WeeklyMealsContext = createContext<WeeklyMealsState | undefined>(undefined);
export function WeeklyMealsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const membership = useMembership();
  const ownerId = user?.id ?? null;
  const owner = useRef(ownerId); owner.current = ownerId;
  const generation = useRef(0); const mounted = useRef(true);
  const [clock, setClock] = useState(Date.now);
  const [state, setState] = useState<{ ownerId: string | null; release: WeeklyRelease | null; availability: ReleaseAvailability | null; error: string; loading: boolean }>({ ownerId: null, release: null, availability: null, error: '', loading: false });
  const [servings, setAmounts] = useState<Record<string, number>>({});
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    const tick = () => {
      clear(); if (stopped || (AppState.currentState && AppState.currentState !== 'active')) return;
      const now = Date.now(); setClock(now);
      const expiry = Date.parse(membership.status?.subscription_end ?? '');
      const staleAt = Date.parse(membership.checkedAt ?? '') + 90000;
      const boundaries = [expiry, staleAt].filter(value => Number.isFinite(value) && value > now);
      const delay = Math.max(1, Math.min(30000, ...boundaries.map(value => value - now + 1)));
      timer = setTimeout(tick, delay);
    };
    tick();
    const subscription = AppState.addEventListener('change', next => { clear(); if (next === 'active') tick(); });
    return () => { stopped = true; clear(); subscription.remove(); };
  }, [membership.status?.subscription_end, membership.checkedAt]);
  const now = Math.max(clock, Date.now());
  const mayRead = Boolean(ownerId && !authLoading && canViewWeeklyContent(membership.status, membership.status?.billing_mode ?? 'live', membership.checkedAt, now));
  const access = useRef(mayRead); access.current = mayRead;
  // Do not invalidate a child's initial focus request from a parent mount effect.
  // Responses are protected by owner, generation and the current access ref instead.
  useEffect(() => {
    setAmounts({});
    setState(previous => previous.ownerId === ownerId ? previous : { ownerId, release: null, availability: null, error: '', loading: false });
  }, [ownerId]);
  useEffect(() => {
    if (!mayRead) setState(previous => previous.release ? { ...previous, release: null, loading: false } : previous);
  }, [mayRead]);
  const refresh = useCallback(async () => {
    if (authLoading) return;
    const version = ++generation.current;
    setState(previous => ({ ...previous, ownerId, release: null, error: '', loading: true }));
    try {
      const [availability, content] = await Promise.all([
        fetchReleaseAvailability(),
        ownerId && mayRead ? fetchWeeklyMeals(ownerId) : Promise.resolve({ data: null, error: null }),
      ]);
      if (!mounted.current || owner.current !== ownerId || generation.current !== version) return;
      setState({ ownerId, release: access.current ? content.data : null, availability: availability.data, error: content.error ?? availability.error ?? '', loading: false });
    } catch {
      if (mounted.current && owner.current === ownerId && generation.current === version) setState(previous => ({ ...previous, release: null, error: 'Weekly meals could not be verified. Check your connection and membership status.', loading: false }));
    }
  }, [ownerId, authLoading, mayRead]);
  const setServings = useCallback((id: string, amount: number) => {
    if (!Number.isFinite(amount)) return;
    setAmounts(current => ({ ...current, [id]: Math.max(0.25, Math.min(8, Math.round(amount * 4) / 4)) }));
  }, []);
  const owned = state.ownerId === ownerId;
  const date = new Date(now); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const release = state.release;
  const visible = owned && mayRead && release !== null && release.week_of === date.toISOString().slice(0, 10) && canViewWeeklyContent(membership.status, release.environment, membership.checkedAt, now);
  return <WeeklyMealsContext.Provider value={{ release: visible ? release : null, availability: state.availability, error: owned ? state.error || (user ? membership.error : '') : '', loading: state.loading || Boolean(user && membership.checking && !membership.status), servings: owned ? servings : {}, refresh, setServings }}>{children}</WeeklyMealsContext.Provider>;
}
