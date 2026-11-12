import { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, ListRenderItem } from 'react-native';
import { Receipt, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Screen, layout } from '@/components/layout/Screen';
import { InvoiceCard } from '@/components/feature/InvoiceCard';
import { Button, Note, ui } from '@/components/ui/Primitives';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import type { InvoiceView } from '@/services/paymentHistory';
import { membership } from '@/constants/membership';
import { theme as t } from '@/constants/theme';

function PaymentHistoryScreen() {
  const p = usePaymentHistory();
  const renderInvoice = useCallback<ListRenderItem<InvoiceView>>(({ item }) => <InvoiceCard invoice={item}/>, []);
  return <Screen detail><FlatList<InvoiceView>
    style={layout.list}
    contentContainerStyle={[layout.content, s.content]}
    data={p.invoices}
    renderItem={renderInvoice}
    keyExtractor={item => item.id}
    showsVerticalScrollIndicator={false}
    refreshing={p.checking}
    onRefresh={p.user && !p.authLoading ? p.refresh : undefined}
    ListHeaderComponent={<View style={s.blocks}>
      <View style={s.hero}><View style={ui.row}><Receipt size={28} color={t.colors.primary}/><Text style={s.eyebrow}>YOUR BROWSER BILLING RECORD</Text></View><Text style={s.title}>A clear view of your payments.</Text><Text style={ui.body}>{membership.displayPrice} USD/month browser subscription. Issued invoices appear newest first, including payment status and any remaining balance.</Text><View style={s.readOnly}><ShieldCheck size={18} color={t.colors.primary}/><Text style={s.readOnlyText}>Read-only · No payment actions</Text></View><Note text="These are browser billing invoices, not Apple or Google receipts. Store purchase history is available separately in your Apple or Google account."/></View>
      <View style={s.panel}>
        <Text style={s.heading}>{p.user ? 'Only your browser subscription invoices' : 'Your billing history is private'}</Text>
        {p.authLoading ? <View style={ui.row}><ActivityIndicator color={t.colors.primary}/><Text style={ui.body}>Checking your account…</Text></View> : p.user ? <><Text style={ui.body}>Signed in as {p.user.email}</Text><Text style={ui.subtle}>Retrieved securely from this account’s APP customer mapping. Website customers and invoices are never imported or searched by email.</Text><Button secondary title={p.checking ? 'Refreshing history…' : 'Refresh payment history'} disabled={p.busy} onPress={p.refresh}/></> : <><Text style={ui.body}>Sign in to the APP account used for your membership. This screen never creates a billing customer or subscription.</Text><Button title="Sign in to view APP history" onPress={p.signIn}/></>}
        {p.billingMode === 'test' ? <Note text="STRIPE TEST HISTORY · These are sandbox invoices, not live payments. Test and live records remain separate."/> : null}
        {p.billingMode === 'live' ? <Text style={s.verified}>Stripe live-mode invoice records</Text> : null}
        {p.checkedLabel ? <Text accessibilityLiveRegion="polite" style={ui.subtle}>Last retrieved: {p.checkedLabel}</Text> : null}
        {p.error ? <><View accessibilityRole="alert" style={s.errorRow}><AlertCircle size={20} color={t.colors.danger}/><Text style={s.error}>{p.error}</Text></View><Button secondary title="Retry history request" disabled={p.busy} onPress={p.retry}/></> : null}
      </View>
      {p.invoices.length ? <View style={s.section}><Text style={s.heading}>Invoice records</Text><Text style={ui.subtle}>{p.invoices.length} loaded · USD amounts from Stripe</Text></View> : null}
    </View>}
    ListEmptyComponent={p.user ? !p.verified && !p.error ? <View style={s.empty}><ActivityIndicator color={t.colors.primary}/><Text style={ui.body}>Retrieving APP invoices…</Text></View> : p.verified ? <View style={s.empty}><Receipt size={32} color={t.colors.citrus}/><Text style={s.heading}>{p.emptyTitle}</Text><Text style={[ui.body, s.center]}>{p.emptyDescription}</Text></View> : null : null}
    ListFooterComponent={<View style={s.blocks}>
      {p.user && p.hasMore ? <Button secondary title={p.loadingOlder ? 'Loading older invoices…' : 'Load older APP invoices'} disabled={p.busy} onPress={p.loadOlder}/> : null}
      {p.user && p.verified && !p.hasMore && p.invoices.length > 0 ? <Text style={[ui.subtle, s.center]}>All verified APP invoice records have been loaded.</Text> : null}
      <Note text="Invoice amounts are billing records, not a complete transaction or refund ledger. Paid status can include account credit or payments recorded outside Stripe. Credit notes are shown separately when available. No card details, payment links, or purchase controls are exposed here; viewing an invoice never unlocks paid content."/>
      <Text style={ui.subtle}>Only invoices exclusively for the verified APP membership are shown. Draft invoices, unrelated items, mixed APP/website invoices, and records whose full ownership cannot be verified are excluded.</Text>
      <Button secondary title="Back to membership" onPress={p.goMembership}/>
    </View>}
  /></Screen>;
}
export { PaymentHistoryScreen as default };
const s = StyleSheet.create({
  content: { paddingTop: t.space.lg },
  blocks: { gap: t.space.lg },
  hero: { padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: t.colors.soft, gap: t.space.md },
  eyebrow: { fontFamily: t.fonts.bold, fontSize: 12, lineHeight: 20, letterSpacing: 1, color: t.colors.citrus, flex: 1, includeFontPadding: false },
  title: { fontFamily: t.fonts.heading, fontSize: 30, lineHeight: 40, color: t.colors.primary, includeFontPadding: false },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexWrap: 'wrap' },
  readOnlyText: { fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.primary, includeFontPadding: false },
  panel: { padding: t.space.lg, borderRadius: t.radius.md, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, gap: t.space.md },
  heading: { fontFamily: t.fonts.heading, fontSize: 22, lineHeight: 30, color: t.colors.primary, includeFontPadding: false },
  verified: { fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.primary, includeFontPadding: false },
  errorRow: { flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' },
  error: { fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.danger, flex: 1, includeFontPadding: false },
  section: { gap: t.space.xs },
  empty: { padding: t.space.lg, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', gap: t.space.md, backgroundColor: t.colors.surface },
  center: { textAlign: 'center' },
});
