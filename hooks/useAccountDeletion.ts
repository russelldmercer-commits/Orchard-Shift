import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { deleteAccount, clearDeletedSession } from '@/services/accountDeletion';
import { storeManagementUrl } from '@/services/nativePurchases';
import { useOrchard } from './useOrchard';
import { useMembership } from './useMembership';
export function useAccountDeletion() {
  const auth = useAuth(); const orchard = useOrchard(); const billing = useMembership(); const router = useRouter(); const { showAlert } = useAlert();
  const [password, setPassword] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [deleted, setDeleted] = useState(false);
  const lock = useRef(false); const mounted = useRef(true); const owner = useRef(auth.user?.id); owner.current = auth.user?.id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setPassword(''); setConfirmed(false); }, [auth.user?.id]);
  const remove = useCallback(async () => {
    const ownerId = auth.user?.id;
    if (!ownerId || lock.current || !confirmed || password.length < 6) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await deleteAccount(ownerId, password);
      if (!mounted.current || owner.current !== ownerId) return;
      setPassword('');
      if (result.error) { setError(result.error); return; }
      let warning = '';
      try { await orchard.eraseDeviceData(); } catch { warning = 'The cloud account was deleted, but device storage could not be erased. Clear app data in your device settings before sharing this device.'; }
      const sessionError = await clearDeletedSession();
      if (mounted.current) { setDeleted(true); setError(warning || sessionError || ''); }
    } catch { if (mounted.current) setError('Deletion could not be confirmed. Please retry.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }, [auth.user?.id, confirmed, password, orchard.eraseDeviceData]);
  const confirmDelete = useCallback(() => showAlert('Permanently delete account?', 'Your account, profile, membership mapping, and device-saved food data will be removed. Apple/Google billing must be cancelled in store settings; deletion does not issue a refund.', [
    { text: 'Keep account', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => { void remove(); } },
  ]), [showAlert, remove]);
  const manage = useCallback(async () => { try { await Linking.openURL(storeManagementUrl(billing.status?.store)); } catch { setError('Store subscription settings could not be opened. Open them from your Apple or Google account.'); } }, [billing.status?.store]);
  const toggleConfirmed = useCallback(() => setConfirmed(current => !current), []);
  const signIn = useCallback(() => router.push('/login'), [router]);
  const home = useCallback(() => router.replace('/(tabs)'), [router]);
  return { user: auth.user, password, setPassword, confirmed, toggleConfirmed, busy, error, deleted, confirmDelete, manage, signIn, home, canDelete: Boolean(auth.user && confirmed && password.length >= 6 && !busy && !auth.loading && !auth.operationLoading) };
}
