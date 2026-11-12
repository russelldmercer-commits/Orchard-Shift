import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { fetchAppPaymentHistory, invoiceView, mergeAppInvoices } from '@/services/paymentHistory';
import type { AppInvoice } from '@/services/paymentHistory';

interface HistoryState {
  ownerId: string | null;
  invoices: AppInvoice[];
  cursor: string | null;
  hasMore: boolean;
  hasCustomer: boolean;
  billingMode: 'test' | 'live' | null;
  checkedAt: string | null;
  phase: 'refresh' | 'older' | null;
  error: string;
  failedAction: 'refresh' | 'older';
}
function emptyState(ownerId: string | null): HistoryState {
  return { ownerId, invoices: [], cursor: null, hasMore: false, hasCustomer: false, billingMode: null, checkedAt: null, phase: null, error: '', failedAction: 'refresh' };
}
export function usePaymentHistory() {
  const { user, loading: authLoading } = useAuth();
  const ownerId = user?.id ?? null;
  const router = useRouter();
  const [state, setState] = useState<HistoryState>(() => emptyState(null));
  const latestOwner = useRef<string | null>(ownerId);
  latestOwner.current = ownerId;
  const focused = useRef(false);
  const version = useRef(0);
  const inFlight = useRef<{ ownerId: string; version: number } | null>(null);
  const loadPage = useCallback(async (cursor: string | null = null) => {
    if (!ownerId || authLoading || !focused.current || inFlight.current?.ownerId === ownerId) return;
    const requestVersion = ++version.current;
    inFlight.current = { ownerId, version: requestVersion };
    const phase = cursor ? 'older' : 'refresh';
    setState(previous => ({ ...(previous.ownerId === ownerId ? previous : emptyState(ownerId)), phase, error: '', failedAction: phase }));
    try {
      const result = await fetchAppPaymentHistory(ownerId, cursor);
      if (!focused.current || latestOwner.current !== ownerId || version.current !== requestVersion) return;
      if (result.error || !result.data) {
        setState(previous => ({ ...previous, phase: null, error: result.error ?? 'No payment history was returned.' }));
        return;
      }
      const page = result.data;
      setState(previous => ({
        ownerId,
        invoices: mergeAppInvoices(cursor && previous.ownerId === ownerId ? previous.invoices : [], page.invoices),
        cursor: page.next_cursor,
        hasMore: page.has_more,
        hasCustomer: page.has_customer,
        billingMode: page.billing_mode,
        checkedAt: page.checked_at,
        phase: null,
        error: '',
        failedAction: phase,
      }));
    } catch {
      if (focused.current && latestOwner.current === ownerId && version.current === requestVersion) setState(previous => ({ ...previous, phase: null, error: 'Unable to load payment history. Check your connection and try again.' }));
    } finally {
      if (inFlight.current?.version === requestVersion) inFlight.current = null;
    }
  }, [ownerId, authLoading]);

  useEffect(() => { setState(emptyState(ownerId)); }, [ownerId]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void loadPage();
    return () => { focused.current = false; version.current += 1; inFlight.current = null; };
  }, [loadPage]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active' && focused.current) void loadPage();
    });
    return () => subscription.remove();
  }, [loadPage]);

  // A render-time owner check hides all previous account data before effects or network calls run.
  const visible = state.ownerId === ownerId ? state : emptyState(ownerId);
  const invoices = useMemo(() => visible.invoices.map(invoiceView), [visible.invoices]);
  const refresh = useCallback(() => { void loadPage(); }, [loadPage]);
  const loadOlder = useCallback(() => { if (visible.hasMore && visible.cursor) void loadPage(visible.cursor); }, [loadPage, visible.hasMore, visible.cursor]);
  const retry = visible.failedAction === 'older' ? loadOlder : refresh;
  const signIn = useCallback(() => router.push('/login'), [router]);
  const goMembership = useCallback(() => router.push('/membership'), [router]);
  const checkedLabel = visible.checkedAt ? new Date(visible.checkedAt).toLocaleString() : null;
  const emptyTitle = visible.hasMore ? 'No APP invoices in this page' : visible.hasCustomer ? 'No issued APP invoices yet' : 'No APP billing customer yet';
  const emptyDescription = visible.hasMore ? 'Only APP membership invoices appear here. Load older records to continue.' : visible.hasCustomer ? 'A completed checkout or renewal can create an invoice. Draft and unrelated invoices are not shown.' : 'This APP account has not created a billing customer. Website purchases are not linked or imported.';
  return { user, authLoading, invoices, error: visible.error, checking: visible.phase === 'refresh', loadingOlder: visible.phase === 'older', busy: visible.phase !== null, hasMore: visible.hasMore, billingMode: visible.billingMode, checkedLabel, verified: visible.checkedAt !== null, emptyTitle, emptyDescription, refresh, loadOlder, retry, signIn, goMembership };
}
