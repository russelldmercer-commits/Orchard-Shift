import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { emptyPortionProfile, formatQuantity, normalizeServings, portionGuidance, portionSources, servingLimits, validatePortionProfile, weightForDisplay, weightInKg, WeightUnit } from '@/services/portions';
import { useOrchard } from './useOrchard';

export function useServingControl(value: number, onChange: (value: number) => void) {
  const amount = normalizeServings(value);
  const decrease = useCallback(() => onChange(normalizeServings(amount - servingLimits.step)),[amount,onChange]);
  const increase = useCallback(() => onChange(normalizeServings(amount + servingLimits.step)),[amount,onChange]);
  return { label: formatQuantity(amount), canDecrease: amount > servingLimits.min, canIncrease: amount < servingLimits.max, decrease, increase };
}
export function usePortionProfile() {
  const orchard = useOrchard();
  const { showAlert } = useAlert();
  const [age,setAge] = useState('');
  const [weight,setWeight] = useState('');
  const [unit,setUnit] = useState<WeightUnit>('kg');
  const [confirmed,setConfirmed] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  useEffect(() => {
    if (!orchard.ready) return;
    const profile = orchard.data.portionProfile;
    setAge(profile.age === null ? '' : String(profile.age));
    setWeight(profile.weightKg === null ? '' : weightForDisplay(profile.weightKg,profile.weightUnit));
    setUnit(profile.weightUnit);
    setConfirmed(profile.adultReferenceConfirmed);
  },[orchard.ready,orchard.data.portionProfile]);
  const isMinor = age.trim() !== '' && Number.isInteger(Number(age)) && Number(age) > 0 && Number(age) < 19;
  const editAge = useCallback((value: string) => {
    setAge(value); setSaved(false); setError('');
    if (value.trim() && Number(value) < 19) { setWeight(''); setConfirmed(false); }
  },[]);
  const editWeight = useCallback((value: string) => { setWeight(value); setSaved(false); setError(''); },[]);
  const changeUnit = useCallback((next: WeightUnit) => {
    if (next === unit) return;
    if (weight.trim()) {
      const number = Number(weight.trim().replace(',', '.'));
      if (Number.isFinite(number) && number > 0) setWeight(weightForDisplay(weightInKg(number,unit),next));
    }
    setUnit(next); setSaved(false); setError('');
  },[weight,unit]);
  const toggleConfirmed = useCallback(() => { setConfirmed(value => !value); setSaved(false); setError(''); },[]);
  const save = useCallback(() => {
    const result = validatePortionProfile(age,weight,unit,confirmed);
    if (!result.profile) { setError(result.error); setSaved(false); return; }
    orchard.setPortionProfile(result.profile); setSaved(true); setError('');
  },[age,weight,unit,confirmed,orchard.setPortionProfile]);
  const clear = useCallback(() => showAlert('Clear age and weight?', 'Remove this profile from this device. Your meal servings, preferences, and progress will not change.',[
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear profile', style: 'destructive', onPress: () => { orchard.setPortionProfile({ ...emptyPortionProfile }); setAge(''); setWeight(''); setUnit('kg'); setConfirmed(false); setError(''); setSaved(false); } },
  ]),[showAlert,orchard.setPortionProfile]);
  return { age,weight,unit,confirmed,error,saved,isMinor,editAge,editWeight,changeUnit,toggleConfirmed,save,clear,ready: orchard.ready,storageError: orchard.storageError,hasProfile: orchard.data.portionProfile.age !== null };
}
export function usePortionGuide(protein?: number) {
  const { data } = useOrchard();
  const router = useRouter();
  const { showAlert } = useAlert();
  const guidance = useMemo(() => portionGuidance(data.portionProfile),[data.portionProfile]);
  const openSource = useCallback(async (source: keyof typeof portionSources) => {
    try { await Linking.openURL(portionSources[source]); }
    catch { showAlert('Unable to open resource', 'Please try again when your browser is available.'); }
  },[showAlert]);
  const editProfile = useCallback(() => router.push('/you'),[router]);
  const contribution = guidance.dailyProtein !== null && protein !== undefined ? Math.round(protein / guidance.dailyProtein * 100) : null;
  return { ...guidance, profile: data.portionProfile, contribution,openSource,editProfile };
}
