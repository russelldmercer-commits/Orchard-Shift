import { createContext, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@/template';
import { fetchMembership, MembershipStatus } from '@/services/membership';
import { setNativeAccount, watchNativePurchases } from '@/services/nativePurchases';

interface MembershipState { ownerId: string | null; status: MembershipStatus | null; error: string; checking: boolean; checkedAt: string | null }
export interface MembershipContextValue {
  status: MembershipStatus | null; error: string; checking: boolean; checkedAt: string | null;
  refresh: () => Promise<void>; awaitCheckout: () => void; pendingCheckout: boolean;
}
export const MembershipContext = createContext<MembershipContextValue | undefined>(undefined);
export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const ownerId = user?.id ?? null;
  const currentOwner = useRef(ownerId); currentOwner.current = ownerId;
  const mounted = useRef(true);
  const generation = useRef(0);
  const request = useRef<{ownerId: string; generation: number; promise: Promise<void>} | null>(null);
  const pendingUntil = useRef(0);
  const [pendingCheckout,setPendingCheckout] = useState(false);
  const [state,setState] = useState<MembershipState>({ ownerId: null, status: null, error: '', checking: false, checkedAt: null });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; },[]);
  const refresh = useCallback((): Promise<void> => {
    if (!ownerId || loading) return Promise.resolve();
    const epoch = generation.current;
    if (request.current?.ownerId === ownerId && request.current.generation === epoch) return request.current.promise;
    setState(previous => ({ ...previous, ownerId, checking: true, error: '', status: previous.ownerId === ownerId ? previous.status : null }));
    const operation = (async () => {
      const result = await fetchMembership(ownerId);
      if (!mounted.current || currentOwner.current !== ownerId || generation.current !== epoch) return;
      setState({ ownerId, status: result.error ? null : result.data, error: result.error ?? '', checking: false, checkedAt: result.error ? null : new Date().toISOString() });
      if (result.data?.subscribed) { pendingUntil.current = 0; setPendingCheckout(false); }
    })();
    request.current = { ownerId, generation: epoch, promise: operation };
    void operation.finally(() => { if (request.current?.promise === operation) request.current = null; });
    return operation;
  },[ownerId,loading]);
  const awaitCheckout = useCallback(() => { pendingUntil.current = Date.now() + 120000; setPendingCheckout(true); },[]);
  useEffect(() => { void setNativeAccount(ownerId); },[ownerId]);
  useEffect(() => {
    if (!ownerId || loading || Platform.OS === 'web') return;
    return watchNativePurchases(ownerId, () => { void refresh(); });
  },[ownerId,loading,refresh]);
  useEffect(() => {
    generation.current += 1; request.current = null;
    pendingUntil.current = 0; setPendingCheckout(false);
    setState({ ownerId, status: null, error: '', checking: false, checkedAt: null });
  },[ownerId]);
  useEffect(() => {
    if (!ownerId || loading) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const active = () => !AppState.currentState || AppState.currentState === 'active';
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
    const tick = async () => {
      clearTimer();
      if (stopped || !active()) return;
      await refresh();
      if (stopped) return;
      const pending = Date.now() < pendingUntil.current;
      if (!pending && mounted.current) setPendingCheckout(false);
      timer = setTimeout(() => { void tick(); },pending ? 10000 : 60000);
    };
    void tick();
    const subscription = AppState.addEventListener('change', next => { clearTimer(); if (next === 'active') void tick(); });
    // Browser focus is checked only inside an effect, not during server rendering.
    const focus = () => { void tick(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus',focus);
    return () => {
      stopped = true; clearTimer(); subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus',focus);
    };
  },[ownerId,loading,refresh,pendingCheckout,user]);
  const owned = state.ownerId === ownerId && ownerId !== null;
  return <MembershipContext.Provider value={{ status: owned ? state.status : null, error: owned ? state.error : '', checking: owned ? state.checking : Boolean(ownerId), checkedAt: owned ? state.checkedAt : null, refresh, awaitCheckout, pendingCheckout: Boolean(ownerId) && pendingCheckout }}>{children}</MembershipContext.Provider>;
}
