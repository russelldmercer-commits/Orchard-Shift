import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { createBillingUrl } from '@/services/membership';
import { loadNativeOffer, purchaseNativeMembership, restoreNativeMembership, storeManagementUrl, type NativeOffer } from '@/services/nativePurchases';
import { fetchReleaseAvailability, type ReleaseAvailability } from '@/services/weeklyMeals';
import { useMembership } from './useMembership';
type Action = 'checkout' | 'portal' | 'purchase' | 'restore';
export function useMembershipScreen() {
  const { user, loading, operationLoading, logout } = useAuth(); const billing = useMembership();
  const router = useRouter(); const { showAlert } = useAlert();
  const [action, setAction] = useState<Action | null>(null); const [actionError, setActionError] = useState('');
  const [consent, setConsent] = useState(false); const [notice, setNotice] = useState('');
  const [availability, setAvailability] = useState<ReleaseAvailability | null>(null); const [availabilityError, setAvailabilityError] = useState('');
  const [offerState, setOfferState] = useState<{ ownerId: string | null; offer: NativeOffer | null; loading: boolean; error: string }>({ ownerId: null, offer: null, loading: false, error: '' });
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const mounted = useRef(true); const actionLock = useRef(false); const actionVersion = useRef(0); const offerVersion = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; offerVersion.current++; actionVersion.current++; }; }, []);
  useEffect(() => { actionVersion.current++; actionLock.current = false; setAction(null); setActionError(''); setConsent(false); setNotice(''); }, [user?.id]);
  const isBrowser = Platform.OS === 'web';
  const loadOffer = useCallback(async () => {
    const version = ++offerVersion.current; const ownerId = user?.id ?? null;
    const availabilityResult = await fetchReleaseAvailability();
    if (!mounted.current || currentUser.current !== (ownerId ?? undefined) || version !== offerVersion.current) return;
    setAvailability(availabilityResult.data); setAvailabilityError(availabilityResult.error ?? '');
    if (!ownerId || loading || isBrowser) return;
    setOfferState({ ownerId, offer: null, loading: true, error: '' });
    const result = await loadNativeOffer(ownerId);
    if (!mounted.current || currentUser.current !== ownerId || version !== offerVersion.current) return;
    setOfferState({ ownerId, offer: result.data, loading: false, error: result.error ?? '' });
  }, [user?.id, loading, isBrowser]);
  useFocusEffect(useCallback(() => { setAvailability(null); void loadOffer(); void billing.refresh(); return () => { offerVersion.current++; }; }, [loadOffer, billing.refresh]));
  const openBilling = useCallback(async (type: 'checkout' | 'portal') => {
    if (!user || actionLock.current || !isBrowser) return;
    if (type === 'checkout') { setActionError('New browser subscriptions are paused. Use the installed app for weekly meal membership.'); return; }
    const ownerId = user.id; const version = ++actionVersion.current;
    actionLock.current = true; setAction('portal'); setActionError(''); setNotice('');
    const owns = () => mounted.current && currentUser.current === ownerId && version === actionVersion.current;
    try {
      const result = await createBillingUrl('portal', Platform.OS);
      if (!owns()) return;
      if (result.error || !result.data) { setActionError(result.error ?? 'No billing URL was returned.'); return; }
      await Linking.openURL(result.data.url);
      if (owns()) setNotice('Billing settings opened. Return here to refresh membership status.');
    } catch { if (owns()) setActionError('Unable to open billing settings. Please try again.'); }
    finally { if (owns()) { actionLock.current = false; setAction(null); } }
  }, [user?.id, isBrowser]);
  const runNative = useCallback(async (type: 'purchase' | 'restore' | 'portal') => {
    if (!user || loading || isBrowser || actionLock.current) return;
    if (type === 'purchase' && (!consent || !availability?.ready || billing.pendingCheckout || billing.status?.subscribed || billing.error || billing.checking)) return;
    const ownerId = user.id; const version = ++actionVersion.current;
    actionLock.current = true; setAction(type); setActionError(''); setNotice('');
    const owns = () => mounted.current && currentUser.current === ownerId && version === actionVersion.current;
    try {
      if (type === 'portal') { await Linking.openURL(storeManagementUrl(billing.status?.store)); if (owns()) setNotice('Subscription settings opened. Your status refreshes when you return.'); return; }
      const result = await (type === 'purchase' ? purchaseNativeMembership(ownerId) : restoreNativeMembership(ownerId));
      if (!owns()) return;
      if (result.error || !result.data) { setActionError(result.error ?? 'The store returned no result.'); return; }
      if (result.data.cancelled) { setNotice('The store request was cancelled. No membership was granted.'); return; }
      billing.awaitCheckout();
      setNotice(result.data.pending ? 'Store approval or payment is pending. Do not purchase again. Your membership will update after verification.' : type === 'restore' ? 'Restore request completed. Checking membership securely.' : 'Purchase submitted. Checking membership securely.');
      await billing.refresh();
    } catch { if (owns()) setActionError('Unable to complete the store request. Please try again.'); }
    finally { if (owns()) { actionLock.current = false; setAction(null); } }
  }, [user?.id, loading, isBrowser, consent, availability?.ready, billing.pendingCheckout, billing.status?.subscribed, billing.status?.store, billing.error, billing.checking, billing.awaitCheckout, billing.refresh]);
  const signOut = useCallback(() => showAlert('Sign out?', 'Your meals, drafts, preferences and portion details remain on this device. Signing out does not cancel a subscription.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: async () => { try { const result = await logout(); if (result.error) showAlert('Unable to sign out', result.error); } catch { showAlert('Unable to sign out', 'Please try again.'); } } },
  ]), [showAlert, logout]);
  const viewPaymentHistory = useCallback(() => router.push('/payment-history'), [router]);
  const signIn = useCallback(() => router.push('/login'), [router]); const goHome = useCallback(() => router.push('/(tabs)'), [router]);
  const openTerms = useCallback(() => router.push('/membership-terms'), [router]); const openPrivacy = useCallback(() => router.push('/privacy'), [router]);
  const openWeeklyMeals = useCallback(() => router.push('/weekly-meals'), [router]); const openSupport = useCallback(() => router.push('/support'), [router]); const openDeleteAccount = useCallback(() => router.push('/delete-account'), [router]);
  const toggleConsent = useCallback(() => setConsent(value => !value), []);
  const purchase = useCallback(() => { void runNative('purchase'); }, [runNative]); const restore = useCallback(() => { void runNative('restore'); }, [runNative]); const manage = useCallback(() => { void runNative('portal'); }, [runNative]); const reloadOffer = useCallback(() => { void loadOffer(); }, [loadOffer]);
  const status = billing.status;
  const periodEnd = status?.subscription_end ? new Date(status.subscription_end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  const statusTitle = !user ? 'Keep your membership with you' : billing.error ? 'Membership could not be verified' : !status ? 'Checking your membership' : status.subscribed ? status.billing_mode === 'test' ? 'Sandbox subscription' : 'Your membership is active' : status.status === 'none' ? 'No subscription yet' : `Subscription: ${status.status.replace(/_/g, ' ')}`;
  const offer = offerState.ownerId === user?.id ? offerState.offer : null; const offerError = offerState.ownerId === user?.id ? offerState.error : '';
  const offerLoading = Boolean(user && !isBrowser && (offerState.ownerId !== user.id || offerState.loading));
  const eligible = Boolean(user && status?.checkout_ready && !status.subscribed && !billing.error && !billing.checking && !action && consent && !billing.pendingCheckout);
  return { ...billing, user, authLoading: loading, operationLoading, action, actionError, consent, notice, toggleConsent, openBilling, signOut, signIn, goHome, viewPaymentHistory, periodEnd, statusTitle, isBrowser, offer, offerError, offerLoading, reloadOffer, purchase, restore, manage, openTerms, openPrivacy, openWeeklyMeals, openSupport, openDeleteAccount, availability, availabilityError,
    canCheckout: eligible && !isBrowser && Boolean(availability?.ready && offer && !offerLoading && !offerError) };
}
