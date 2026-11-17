import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@/template';
import { fetchMembership, type MembershipStatus } from '@/services/membership';
import { setNativeAccount, watchNativePurchases } from '@/services/nativePurchases';
interface MembershipState { ownerId: string | null; version: number; status: MembershipStatus | null; error: string; checking: boolean; checkedAt: string | null }
export interface MembershipContextValue {
  status: MembershipStatus | null; error: string; checking: boolean; checkedAt: string | null;
  refresh: () => Promise<void>; awaitCheckout: () => void; pendingCheckout: boolean;
}
export const MembershipContext = createContext<MembershipContextValue | undefined>(undefined);
export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth(); const ownerId = user?.id ?? null;
  const currentOwner = useRef(ownerId); const mounted = useRef(true); const generation = useRef(0);
  const request = useRef<{ ownerId: string; generation: number; promise: Promise<void> } | null>(null);
  const pendingUntil = useRef(0);
  // Invalidate before rendering: even A -> B -> A cannot reveal an older account epoch.
  if (currentOwner.current !== ownerId) { currentOwner.current = ownerId; generation.current++; request.current = null; pendingUntil.current = 0; }
  const [pending, setPending] = useState({ ownerId: null as string | null, version: -1, until: 0 });
  const [state, setState] = useState<MembershipState>({ ownerId: null, version: -1, status: null, error: '', checking: false, checkedAt: null });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const refresh = useCallback((): Promise<void> => {
    if (!ownerId || loading) return Promise.resolve();
    const epoch = generation.current;
    if (request.current?.ownerId === ownerId && request.current.generation === epoch) return request.current.promise;
    const owns = () => mounted.current && currentOwner.current === ownerId && generation.current === epoch;
    setState(previous => ({ ownerId, version: epoch, checking: true, error: '', status: previous.ownerId === ownerId && previous.version === epoch ? previous.status : null, checkedAt: previous.ownerId === ownerId && previous.version === epoch ? previous.checkedAt : null }));
    const operation = (async () => {
      try {
        const result = await fetchMembership(ownerId); if (!owns()) return;
        setState({ ownerId, version: epoch, status: result.error ? null : result.data, error: result.error ?? '', checking: false, checkedAt: result.error || !result.data ? null : new Date().toISOString() });
        if (result.data?.subscribed) { pendingUntil.current = 0; setPending({ ownerId, version: epoch, until: 0 }); }
      } catch {
        if (owns()) setState({ ownerId, version: epoch, status: null, error: 'Membership could not be verified. Check your connection and try again.', checking: false, checkedAt: null });
      }
    })();
    request.current = { ownerId, generation: epoch, promise: operation };
    void operation.finally(() => { if (request.current?.promise === operation) request.current = null; });
    return operation;
  }, [ownerId, loading]);
  const awaitCheckout = useCallback(() => {
    if (!ownerId || currentOwner.current !== ownerId) return;
    pendingUntil.current = Date.now() + 120000; setPending({ ownerId, version: generation.current, until: pendingUntil.current });
  }, [ownerId]);
  useEffect(() => { void setNativeAccount(ownerId); }, [ownerId]);
  useEffect(() => {
    if (!ownerId || loading || Platform.OS === 'web') return;
    return watchNativePurchases(ownerId, () => { void refresh(); });
  }, [ownerId, loading, refresh]);
  useEffect(() => {
    const epoch = generation.current;
    // Preserve an initial focus request from children rather than cancelling it at mount.
    setState(previous => previous.ownerId === ownerId && previous.version === epoch ? previous : { ownerId, version: epoch, status: null, error: '', checking: false, checkedAt: null });
  }, [ownerId]);
  const pendingCheckout = Boolean(ownerId && pending.ownerId === ownerId && pending.version === generation.current && pending.until > Date.now());
  useEffect(() => {
    if (!ownerId || loading) return;
    let stopped = false; let cycle = 0; let timer: ReturnType<typeof setTimeout> | null = null;
    const active = () => Platform.OS === 'web' || !AppState.currentState || AppState.currentState === 'active';
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
    const tick = async () => {
      const version = ++cycle; clearTimer(); if (stopped || !active()) return;
      await refresh(); if (stopped || version !== cycle || !active()) return;
      const isPending = Date.now() < pendingUntil.current;
      if (!isPending && mounted.current) setPending({ ownerId, version: generation.current, until: 0 });
      timer = setTimeout(() => { void tick(); }, isPending ? 10000 : 60000);
    };
    void tick();
    const subscription = AppState.addEventListener('change', next => { cycle++; clearTimer(); if (next === 'active') void tick(); });
    const focus = () => { void tick(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', focus);
    return () => { stopped = true; cycle++; clearTimer(); subscription.remove(); if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', focus); };
  }, [ownerId, loading, refresh, pendingCheckout]);
  const owned = !loading && ownerId !== null && state.ownerId === ownerId && state.version === generation.current;
  return <MembershipContext.Provider value={{ status: owned ? state.status : null, error: owned ? state.error : '', checking: owned ? state.checking : Boolean(ownerId), checkedAt: owned ? state.checkedAt : null, refresh, awaitCheckout, pendingCheckout }}>{children}</MembershipContext.Provider>;
}
