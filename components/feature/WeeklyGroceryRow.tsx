import { memo } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeeklyGrocery } from '@/services/weeklyMealPlan';
import { theme as t } from '@/constants/theme';
interface WeeklyGroceryRowProps { item: WeeklyGrocery; checked: boolean; onPress: () => void }
export const WeeklyGroceryRow = memo(function WeeklyGroceryRow({ item, checked, onPress }: WeeklyGroceryRowProps) {
  const amount = Math.round(item.quantity * 100) / 100;
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${item.name}, ${amount} ${item.unit}`} onPress={onPress} style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}>
    <Ionicons name={checked ? 'checkbox-outline' : 'square-outline'} size={26} color={t.colors.primary}/><Text style={[s.name, checked ? s.checked : null]}>{item.name}</Text><Text style={s.quantity}>{amount} {item.unit}</Text>
  </Pressable>;
});
const s = StyleSheet.create({ row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: t.space.md, padding: t.space.md, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.sm }, name: { flex: 1, fontFamily: t.fonts.body, fontSize: 16, lineHeight: 26, color: t.colors.ink, includeFontPadding: false }, checked: { textDecorationLine: 'line-through', color: t.colors.subtle }, quantity: { flexShrink: 1, fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.primary, includeFontPadding: false } });
