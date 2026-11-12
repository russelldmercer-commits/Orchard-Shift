import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { fetchReleaseAvailability, type ReleaseInformation } from '@/services/weeklyMeals';
import { bundledReleaseInformation } from '@/services/releaseInformation';
export function useSupport() {
  const [information, setInformation] = useState<ReleaseInformation | null>(bundledReleaseInformation); const [error, setError] = useState('');
  const router = useRouter(); const { showAlert } = useAlert();
  useEffect(() => { let active = true; void fetchReleaseAvailability().then(result => { if (active) { const contact = result.data?.information ?? bundledReleaseInformation(); setInformation(contact); setError(contact ? '' : result.error ?? 'Support contact details are awaiting operator configuration.'); } }); return () => { active = false; }; }, []);
  const open = useCallback(async (url: string | undefined) => { if (!url) { showAlert('Contact unavailable', 'Support information has not been configured yet.'); return; } try { await Linking.openURL(url); } catch { showAlert('Unable to open link', 'Try opening the displayed address in your browser or email app.'); } }, [showAlert]);
  const email = useCallback(() => { void open(information ? `mailto:${information.supportEmail}?subject=Orchard%20Shift%20support` : undefined); }, [information, open]);
  const privacy = useCallback(() => router.push('/privacy'), [router]);
  const terms = useCallback(() => router.push('/membership-terms'), [router]);
  const deletion = useCallback(() => router.push('/delete-account'), [router]);
  return { information, error, email, open, privacy, terms, deletion };
}
