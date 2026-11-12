import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Clock3, CircleSlash, AlertCircle } from 'lucide-react-native';
import type { InvoiceView } from '@/services/paymentHistory';
import { theme as t } from '@/constants/theme';

interface InvoiceCardProps { invoice: InvoiceView }
export const InvoiceCard = memo(function InvoiceCard({ invoice }: InvoiceCardProps) {
  const StatusIcon = invoice.status === 'paid' ? CheckCircle2 : invoice.status === 'open' ? Clock3 : invoice.status === 'void' ? CircleSlash : AlertCircle;
  const statusColor = invoice.status === 'paid' ? t.colors.primary : invoice.status === 'uncollectible' ? t.colors.danger : t.colors.citrus;
  return <View style={s.card}>
    <View style={s.top}><View style={s.summary}><Text style={s.kicker}>APP MEMBERSHIP · USD</Text><Text style={s.amount}>{invoice.amountLabel}</Text><Text style={s.caption}>{invoice.status === 'paid' ? 'Paid on this invoice' : 'Invoice total · not a payment receipt'}</Text></View><View style={s.badge}><StatusIcon size={18} color={statusColor}/><Text style={[s.status, { color: statusColor }]}>{invoice.statusLabel}</Text></View></View>
    <Text selectable style={s.number}>{invoice.number}</Text>
    <Text style={s.body}>Issued {invoice.issuedLabel}</Text>
    {invoice.periodLabel ? <Text style={s.body}>Billing period: {invoice.periodLabel}</Text> : null}
    {invoice.paidDateLabel ? <Text style={s.body}>Marked paid: {invoice.paidDateLabel}</Text> : null}
    <View style={s.amounts}><View style={s.row}><Text style={s.body}>Invoice total</Text><Text style={s.value}>{invoice.totalLabel}</Text></View><View style={s.row}><Text style={s.body}>Amount paid</Text><Text style={s.value}>{invoice.paidLabel}</Text></View><View style={s.row}><Text style={s.body}>Remaining balance</Text><Text style={s.value}>{invoice.remainingLabel}</Text></View>{invoice.creditLabel ? <View style={s.row}><Text style={[s.body, s.flex]}>Credit notes after payment</Text><Text style={s.value}>{invoice.creditLabel}</Text></View> : null}</View>
  </View>;
});
const s = StyleSheet.create({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.space.lg, gap: t.space.sm },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.space.md },
  summary: { flexGrow: 1, flexShrink: 1, gap: t.space.xs },
  kicker: { fontFamily: t.fonts.bold, fontSize: 12, lineHeight: 20, letterSpacing: 1, color: t.colors.citrus, includeFontPadding: false },
  amount: { fontFamily: t.fonts.heading, fontSize: 32, lineHeight: 42, color: t.colors.primary, includeFontPadding: false },
  caption: { fontFamily: t.fonts.body, fontSize: 14, lineHeight: 23, color: t.colors.subtle, includeFontPadding: false },
  badge: { flexDirection: 'row', gap: t.space.sm, alignItems: 'center', backgroundColor: t.colors.soft, paddingHorizontal: t.space.md, paddingVertical: t.space.sm, borderRadius: t.radius.sm, flexShrink: 1 },
  status: { fontFamily: t.fonts.bold, fontSize: 14, lineHeight: 23, flexShrink: 1, includeFontPadding: false },
  number: { fontFamily: t.fonts.bold, fontSize: 18, lineHeight: 29, color: t.colors.ink, includeFontPadding: false },
  body: { fontFamily: t.fonts.body, fontSize: 16, lineHeight: 26, color: t.colors.subtle, includeFontPadding: false },
  amounts: { gap: t.space.sm, borderTopWidth: 1, borderTopColor: t.colors.border, marginTop: t.space.sm, paddingTop: t.space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.space.md },
  value: { fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.ink, includeFontPadding: false },
  flex: { flex: 1 },
});
