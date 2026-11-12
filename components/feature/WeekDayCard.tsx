import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { Plate, Slot } from '@/services/content';
import { theme as t } from '@/constants/theme';
import { ServingControl } from './ServingControl';
interface WeekDayCardProps { name: string; meals: { key: string; slot: Slot; plate: Plate; servings: number }[]; onOpen: (slot: Slot,id: string) => void; onServingsChange: (key: string,value: number) => void }
export const WeekDayCard = memo(function WeekDayCard({name,meals,onOpen,onServingsChange}: WeekDayCardProps) {
  return <View style={s.card}><Text style={s.title}>{name}</Text>{meals.map(({key,slot,plate,servings}) => <View key={slot} style={s.meal}><Pressable accessibilityRole="button" accessibilityLabel={`Change ${name} ${slot}: ${plate.name}`} onPress={() => onOpen(slot,plate.id)} style={({pressed}) => [s.row,{opacity:pressed ? 0.65 : 1}]}><View style={s.text}><Text style={s.slot}>{slot.toUpperCase()}</Text><Text style={s.name}>{plate.name}</Text><Text style={s.meta}>~{plate.kcal} kcal · {plate.protein}g protein · {plate.fiber}g fiber total</Text></View><RefreshCw size={18} color={t.colors.citrus}/></Pressable><ServingControl value={servings} label={`${slot} servings`} onChange={value => onServingsChange(key,value)}/></View>)}</View>;
});
const s = StyleSheet.create({card:{backgroundColor:t.colors.surface,borderRadius:t.radius.md,borderWidth:1,borderColor:t.colors.border,padding:t.space.md},title:{fontFamily:t.fonts.heading,fontSize:23,color:t.colors.primary,paddingBottom:t.space.sm},meal:{borderTopWidth:1,borderTopColor:t.colors.border,paddingBottom:t.space.md,gap:t.space.sm},row:{flexDirection:'row',alignItems:'center',gap:t.space.md,paddingVertical:t.space.md,minHeight:80},text:{flex:1,gap:5},slot:{fontFamily:t.fonts.bold,fontSize:10,letterSpacing:1.5,color:t.colors.citrus},name:{fontFamily:t.fonts.medium,fontSize:16,color:t.colors.ink},meta:{fontFamily:t.fonts.body,fontSize:14,lineHeight:22,color:t.colors.subtle}});
