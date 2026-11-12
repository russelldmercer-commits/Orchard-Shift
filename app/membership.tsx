import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Leaf, Check, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { Screen, layout } from '@/components/layout/Screen';
import { Button, Note, ui } from '@/components/ui/Primitives';
import { useMembershipScreen } from '@/hooks/useMembershipScreen';
import { membership } from '@/constants/membership';
import { theme as t } from '@/constants/theme';

export function MembershipPage() {
  const p = useMembershipScreen();
  const busy = Boolean(p.action) || p.authLoading || p.operationLoading;
  return <Screen detail><ScrollView style={layout.list} contentContainerStyle={[layout.content,s.content]} showsVerticalScrollIndicator={false}>
    <View style={s.hero}>
      <View style={ui.row}><Leaf size={28} color={t.colors.primary}/><Text style={s.eyebrow}>YOUR ORCHARD · YOUR PACE</Text></View>
      <Text style={s.title}>Orchard Shift membership.</Text>
      <Text style={s.price}>{p.offer?.priceString ?? membership.displayPrice}<Text style={s.unit}> {p.offer?.currency ?? 'USD'} / month</Text></Text>
      <Text style={ui.body}>Monthly membership, with automatic renewal. Cancel anytime in {p.isBrowser ? 'your billing settings' : 'your store subscription settings'}.</Text>
      <Text style={ui.subtle}>Your membership includes a new seven-day meal collection every week, with recipes, adjustable servings and a shopping list. Starter food tools remain available without a subscription.</Text>
    </View>
    <Button secondary title="View this week’s meals" onPress={p.openWeeklyMeals}/>
    {!p.availability?.ready ? <Note text={p.availabilityError || p.availability?.message || 'Checking weekly meal availability. New purchases stay paused until release requirements and this week’s meals are ready.'}/> : null}
    <View style={s.panel}>
      <View style={ui.row}><ShieldCheck size={24} color={t.colors.primary}/><Text style={s.heading}>{p.statusTitle}</Text></View>
      <Text style={ui.body}>{p.user ? p.user.email : 'Sign in with a verified email to purchase or restore your membership.'}</Text>
      {p.status?.subscribed && p.status.billing_mode === 'test' ? <Note text="SANDBOX SUBSCRIPTION · This is a test purchase, not a live paid entitlement."/> : null}
      {p.periodEnd ? <Text style={ui.body}>{p.status?.cancel_at_period_end ? 'Scheduled to end' : p.status?.subscribed ? 'Current period ends' : 'Last period ended'}: {p.periodEnd}</Text> : null}
      {p.status?.status === 'grace_period' ? <Note text="The store reported a billing issue. Check your subscription settings to update payment details."/> : null}
      {p.checkedAt ? <Text style={ui.subtle}>Securely checked: {new Date(p.checkedAt).toLocaleTimeString()}</Text> : null}
      {p.checking || p.authLoading ? <View style={ui.row}><ActivityIndicator color={t.colors.primary}/><Text style={ui.subtle}>Checking membership…</Text></View> : null}
      {p.error || p.actionError ? <View accessibilityRole="alert" style={s.errorRow}><AlertCircle size={20} color={t.colors.danger}/><Text style={s.error}>{p.actionError || p.error}</Text></View> : null}
      {!p.user ? <Button title="Sign in or create an account" disabled={p.authLoading} onPress={p.signIn}/> : <Button secondary title={p.checking ? 'Checking membership…' : 'Refresh membership status'} disabled={p.checking || busy} onPress={() => { void p.refresh(); }}/>} 
    </View>
    {p.user ? <View style={s.panel}>
      <Text style={s.heading}>{p.isBrowser ? 'Secure billing' : p.status?.store === 'app_store' ? 'Apple subscription' : p.status?.store === 'play_store' ? 'Google Play subscription' : 'Your monthly subscription'}</Text>
      {p.isBrowser ? p.status && p.status.status !== 'none' ? <Button title={p.action === 'portal' ? 'Opening billing…' : 'Manage subscription'} disabled={busy || p.checking || !p.status.has_customer} onPress={() => { void p.openBilling('portal'); }}/> : <>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:p.consent}} accessibilityLabel="Agree to recurring $12.99 USD monthly membership billing" onPress={p.toggleConsent} disabled={busy} style={({pressed}) => [s.consent,{opacity:pressed ? 0.65 : 1}]}><View style={[s.box,p.consent ? s.checked : null]}>{p.consent ? <Check size={18} color={t.colors.surface}/> : null}</View><Text style={[ui.body,s.flex]}>I agree to $12.99 USD per month, renewing until cancelled. Membership includes weekly meal collections.</Text></Pressable>
        <Text style={ui.body}>New subscriptions are available through Apple or Google in the installed mobile app.</Text>
        <Text style={ui.subtle}>The final total and any applicable taxes are shown before confirmation.</Text>
      </> : <>
        {!p.status?.subscribed ? <>
          {p.offerLoading ? <View style={ui.row}><ActivityIndicator color={t.colors.primary}/><Text style={ui.body}>Loading the store price…</Text></View> : null}
          {p.offerError ? <><View accessibilityRole="alert" style={s.errorRow}><AlertCircle size={20} color={t.colors.danger}/><Text style={s.error}>{p.offerError}</Text></View><Button secondary title="Retry store connection" disabled={busy || p.offerLoading} onPress={p.reloadOffer}/></> : null}
          {p.offer ? <Pressable accessibilityRole="checkbox" accessibilityState={{checked:p.consent}} accessibilityLabel={`Agree to monthly renewal at ${p.offer.priceString} ${p.offer.currency}`} onPress={p.toggleConsent} disabled={busy} style={({pressed}) => [s.consent,{opacity:pressed ? 0.65 : 1}]}><View style={[s.box,p.consent ? s.checked : null]}>{p.consent ? <Check size={18} color={t.colors.surface}/> : null}</View><Text style={[ui.body,s.flex]}>I agree to {p.offer.priceString} {p.offer.currency} each month, renewing until cancelled. Membership includes weekly meal collections.</Text></Pressable> : null}
          <Button title={p.action === 'purchase' ? 'Waiting for the store…' : p.pendingCheckout ? 'Awaiting verification…' : p.offer ? `Subscribe · ${p.offer.priceString}/month` : 'Subscription unavailable'} disabled={!p.canCheckout} onPress={p.purchase}/>
          <Text style={ui.subtle}>Payment is handled by Apple or Google. Confirm the local price in the store before purchasing.</Text>
        </> : <Button title={p.action === 'portal' ? 'Opening store settings…' : 'Manage subscription'} disabled={busy} onPress={p.manage}/>}
        <Button secondary title={p.action === 'restore' ? 'Restoring purchases…' : 'Restore purchases'} disabled={busy} onPress={p.restore}/>
        {!p.status?.subscribed ? <Button secondary title="Open store subscription settings" disabled={busy} onPress={p.manage}/> : null}
        <Text style={ui.subtle}>Restore with the original store account while signed in to your Orchard Shift account.</Text>
      </>}
      {p.pendingCheckout ? <Text accessibilityLiveRegion="polite" style={ui.body}>Awaiting secure verification. Check your status before trying another purchase.</Text> : null}
      {p.notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{p.notice}</Text> : null}
      {p.isBrowser ? <Button secondary title="View payment history" onPress={p.viewPaymentHistory}/> : <Text style={ui.subtle}>Purchase receipts and payment records are available in your Apple or Google account.</Text>}
    </View> : null}
    <View style={s.links}><Button secondary title="Subscription terms" onPress={p.openTerms}/><Button secondary title="Privacy information" onPress={p.openPrivacy}/><Button secondary title="Help & support" onPress={p.openSupport}/>{p.user ? <Button secondary title="Delete my account" onPress={p.openDeleteAccount}/> : null}</View>
    <Note text="Your meals, reflection drafts, checklists, preferences, age, and weight stay on this device. Signing in or subscribing does not upload them. Signing out does not cancel your subscription."/>
    {p.user ? <Button secondary title="Sign out" disabled={busy} onPress={p.signOut}/> : null}
    <Button secondary title="Back to my daily path" onPress={p.goHome}/>
  </ScrollView></Screen>;
}
export default MembershipPage;
const s = StyleSheet.create({
  content:{paddingTop:t.space.lg},hero:{padding:t.space.lg,borderRadius:t.radius.lg,backgroundColor:t.colors.soft,gap:t.space.md},
  eyebrow:{fontFamily:t.fonts.bold,fontSize:12,lineHeight:20,letterSpacing:1,color:t.colors.citrus,flex:1,includeFontPadding:false},
  title:{fontFamily:t.fonts.heading,fontSize:30,lineHeight:40,color:t.colors.primary,includeFontPadding:false},
  price:{fontFamily:t.fonts.heading,fontSize:40,lineHeight:52,color:t.colors.primary,includeFontPadding:false},
  unit:{fontFamily:t.fonts.medium,fontSize:16,lineHeight:26,color:t.colors.primary,includeFontPadding:false},
  panel:{padding:t.space.lg,borderRadius:t.radius.md,backgroundColor:t.colors.surface,borderWidth:1,borderColor:t.colors.border,gap:t.space.md},
  heading:{fontFamily:t.fonts.heading,fontSize:22,lineHeight:30,color:t.colors.primary,flexShrink:1,includeFontPadding:false},
  errorRow:{flexDirection:'row',gap:t.space.sm,alignItems:'flex-start'},error:{fontFamily:t.fonts.medium,fontSize:16,lineHeight:26,color:t.colors.danger,flex:1,includeFontPadding:false},
  consent:{flexDirection:'row',alignItems:'flex-start',gap:t.space.md,minHeight:48,paddingVertical:t.space.sm},
  box:{width:24,height:24,borderRadius:t.radius.sm,borderWidth:1.5,borderColor:t.colors.primary,alignItems:'center',justifyContent:'center',marginTop:t.space.xs},
  checked:{backgroundColor:t.colors.primary},flex:{flex:1},links:{gap:t.space.sm},
});
