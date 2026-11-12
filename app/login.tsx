import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Screen, layout } from '@/components/layout/Screen';
import { Button, Chip, Field, Note, ui } from '@/components/ui/Primitives';
import { useAccountForm } from '@/hooks/useAccountForm';
import { theme as t } from '@/constants/theme';

export default function LoginPage() {
  const p = useAccountForm();
  const router = useRouter();
  const signedIn = Boolean(p.user && (p.mode !== 'recovery' || p.recovered));
  return <Screen title={p.title} subtitle="Your free food tools stay on this device."><ScrollView style={layout.list} contentContainerStyle={layout.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.intro}><ShieldCheck size={28} color={t.colors.primary}/><Text style={s.heading}>Your Orchard Shift account.</Text><Text style={ui.body}>Sign in to keep your weekly meal membership with your account and restore store purchases. Starter meal plans, personal preferences and reflections stay on this device.</Text></View>
    {signedIn ? <View style={s.form}><Text style={s.heading}>You are signed in</Text><Text style={ui.body}>{p.user?.email}</Text>{p.notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{p.notice}</Text> : null}<Button title="View membership" onPress={() => router.push('/membership')}/><Text style={ui.subtle}>Your device-saved reflections and food preferences are not uploaded.</Text></View> : <View style={s.form}>
      <View style={s.modes}><Chip title="Sign in" selected={p.mode === 'login'} onPress={() => p.changeMode('login')}/><Chip title="Create account" selected={p.mode === 'signup'} onPress={() => p.changeMode('signup')}/><Chip title="Recover" selected={p.mode === 'recovery'} onPress={() => p.changeMode('recovery')}/></View>
      <Field label="Email" value={p.email} onChangeText={p.setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={320} editable={!p.busy && p.stage === 'details'} placeholder="you@example.com"/>
      {p.mode !== 'recovery' || p.stage === 'code' ? <><Field label={p.mode === 'recovery' ? 'New password' : 'Password'} value={p.password} onChangeText={p.setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={p.mode === 'login' ? 'current-password' : 'new-password'} editable={!p.busy} maxLength={128} placeholder="At least 6 characters"/>{p.mode !== 'login' ? <Field label="Confirm password" value={p.confirmation} onChangeText={p.setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!p.busy} maxLength={128}/> : null}</> : null}
      {p.stage === 'code' && p.mode !== 'login' ? <><View style={ui.row}><Mail size={20} color={t.colors.citrus}/><Text style={[ui.body,s.flex]}>Use the latest 4-digit code sent to your email.</Text></View><Field label="4-digit email code" value={p.code} onChangeText={p.setCode} keyboardType="number-pad" maxLength={4} autoComplete="one-time-code" editable={!p.busy}/></> : null}
      {p.error ? <View accessibilityRole="alert" style={s.errorRow}><AlertCircle size={20} color={t.colors.danger}/><Text style={s.error}>{p.error}</Text></View> : null}
      {p.notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{p.notice}</Text> : null}
      <Button title={p.buttonLabel} onPress={() => { void p.submit(); }} disabled={p.busy}/>
      {p.stage === 'code' && p.mode !== 'login' ? <><Button secondary title="Resend email code" onPress={() => { void p.resend(); }} disabled={p.busy}/><Button secondary title="Use a different email" onPress={p.restart} disabled={p.busy}/></> : null}
      {p.mode === 'recovery' ? <Text style={ui.subtle}>Use the verification code from your recovery email. If it does not arrive, check your spam folder or resend the code.</Text> : null}
    </View>}
    <Note text="Local drafts and optional age/weight remain on this device after signing out. Anyone using the same device may see them. Account deletion includes erasing this device’s food data."/>
    <Button secondary title="Continue with free food tools" onPress={() => router.push('/(tabs)')}/>
  </ScrollView></Screen>;
}
const s = StyleSheet.create({intro:{backgroundColor:t.colors.soft,padding:t.space.lg,borderRadius:t.radius.md,gap:t.space.md},heading:{fontFamily:t.fonts.heading,fontSize:22,lineHeight:30,color:t.colors.primary},form:{padding:t.space.lg,borderRadius:t.radius.md,borderWidth:1,borderColor:t.colors.border,backgroundColor:t.colors.surface,gap:t.space.md},modes:{flexDirection:'row',flexWrap:'wrap',gap:t.space.sm},errorRow:{flexDirection:'row',gap:t.space.sm,alignItems:'flex-start'},error:{fontFamily:t.fonts.medium,fontSize:16,lineHeight:26,color:t.colors.danger,flex:1},flex:{flex:1}});
