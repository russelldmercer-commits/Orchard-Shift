import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Note, ui } from '@/components/ui/Primitives';
import { ServingControl } from '@/components/feature/ServingControl';
import type { WeeklyRecipe } from '@/services/weeklyMealPlan';
import { theme as t } from '@/constants/theme';
interface WeeklyRecipeCardProps {
  meal: WeeklyRecipe; selected: boolean; expanded: boolean; servings: number; dayName: string;
  optionsCount: number; disliked: string[]; liked: string[];
  onExpand: () => void; onServings: (amount: number) => void; onSelect: () => void;
}
export const WeeklyRecipeCard = memo(function WeeklyRecipeCard({ meal, selected, expanded, servings, dayName, optionsCount, disliked, liked, onExpand, onServings, onSelect }: WeeklyRecipeCardProps) {
  return <View style={[s.card, selected ? s.selected : null]}>
    <View style={s.status}><Ionicons name={selected ? 'checkmark-circle-outline' : 'swap-horizontal-outline'} size={22} color={t.colors.primary}/><Text accessibilityLiveRegion="polite" style={s.statusText}>{selected ? `In your ${dayName} plan` : `${dayName} ${meal.slot.toLowerCase()} alternative`}</Text></View>
    <Pressable onPress={onExpand} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${meal.name}, ${expanded ? 'hide' : 'show'} ingredients and method`} style={({ pressed }) => [s.recipe, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={ui.label}>{meal.slot.toUpperCase()} · {meal.style.toUpperCase()}</Text><Text style={s.name}>{meal.name}</Text><Text style={ui.body}>{meal.description}</Text>
      <Text style={ui.body}>{meal.minutes} min · ~{Math.round(meal.kcal * servings)} kcal · {Math.round(meal.protein * servings)}g protein · {Math.round(meal.fiber * servings)}g fiber</Text>
      <Text style={ui.subtle}>Estimated recipe totals for {servings} serving{servings === 1 ? '' : 's'}, not a personal portion prescription.</Text>
      <Text style={s.link}>{expanded ? 'Close recipe' : 'Ingredients & method'}</Text>
    </Pressable>
    {disliked.length ? <View style={s.warning}><Ionicons name="alert-circle-outline" size={22} color={t.colors.citrus}/><Text style={[ui.body, s.flex]}>Contains foods you dislike: {disliked.join(', ')}. Preferences are not allergy protection.</Text></View> : liked.length ? <Text style={s.statusText}>Includes foods you like: {liked.join(', ')}.</Text> : null}
    {expanded ? <View style={s.details}>
      <ServingControl value={servings} onChange={onServings} hint={selected ? 'Your planned ingredients and shopping totals update together.' : 'Preview servings, then choose this recipe to update your weekly shopping list.'}/>
      <Text style={s.section}>Ingredients</Text><Text style={ui.body}>{meal.ingredients.map(item => `${Math.round(item.quantity * servings * 100) / 100} ${item.unit} ${item.name}`).join('\n')}</Text>
      <Text style={s.section}>Method</Text><Text style={ui.body}>{meal.steps.map((step, index) => `${index + 1}. ${step}`).join('\n\n')}</Text>
      <Note text="Check labels, ingredients, safe cooking temperatures and any swaps. Substitutions change nutrition and are not applied automatically."/>
    </View> : null}
    {!selected ? <Button secondary title={`Use for ${dayName} ${meal.slot.toLowerCase()}`} onPress={onSelect}/> : optionsCount === 1 ? <Text style={ui.subtle}>This collection has one reviewed option for this day and meal. No additional recipe is invented or substituted.</Text> : <Text style={ui.subtle}>{optionsCount - 1} published alternative{optionsCount === 2 ? '' : 's'} below; compare the estimates before choosing.</Text>}
  </View>;
});
const s = StyleSheet.create({ card: { flex: 1, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.space.md, gap: t.space.md }, selected: { borderColor: t.colors.primary }, status: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm }, statusText: { fontFamily: t.fonts.medium, fontSize: 16, lineHeight: 26, color: t.colors.primary, flexShrink: 1, includeFontPadding: false }, recipe: { gap: t.space.sm, minHeight: 48 }, name: { fontFamily: t.fonts.heading, fontSize: 24, lineHeight: 32, color: t.colors.primary, includeFontPadding: false }, section: { fontFamily: t.fonts.bold, fontSize: 18, lineHeight: 26, color: t.colors.primary }, details: { gap: t.space.md }, link: { fontFamily: t.fonts.bold, fontSize: 16, lineHeight: 26, color: t.colors.citrus }, warning: { padding: t.space.md, backgroundColor: t.colors.soft, borderRadius: t.radius.sm, flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' }, flex: { flex: 1 } });
