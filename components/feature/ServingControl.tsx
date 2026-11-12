import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useServingControl } from '@/hooks/usePortions';
import { theme as t } from '@/constants/theme';
interface ServingControlProps { value: number; onChange: (value: number) => void; label?: string; hint?: string }
export const ServingControl = memo(function ServingControl({ value,onChange,label = 'Recipe servings',hint }: ServingControlProps) {
  const p = useServingControl(value,onChange);
  return <View style={s.wrap}><View style={s.row}><Text style={s.label}>{label}</Text><View style={s.stepper}>
    <Pressable disabled={!p.canDecrease} accessibilityRole="button" accessibilityLabel={`Decrease ${label} by one quarter`} accessibilityState={{disabled: !p.canDecrease}} onPress={p.decrease} style={({pressed}) => [s.button,{opacity: !p.canDecrease ? 0.35 : pressed ? 0.65 : 1}]}><Minus size={20} color={t.colors.primary}/></Pressable>
    <Text accessibilityLiveRegion="polite" accessibilityLabel={`${p.label} recipe servings`} style={s.value}>{p.label}</Text>
    <Pressable disabled={!p.canIncrease} accessibilityRole="button" accessibilityLabel={`Increase ${label} by one quarter`} accessibilityState={{disabled: !p.canIncrease}} onPress={p.increase} style={({pressed}) => [s.button,{opacity: !p.canIncrease ? 0.35 : pressed ? 0.65 : 1}]}><Plus size={20} color={t.colors.primary}/></Pressable>
  </View></View>{hint ? <Text style={s.hint}>{hint}</Text> : null}</View>;
});
const s = StyleSheet.create({wrap:{gap:t.space.sm},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:t.space.sm,flexWrap:'wrap'},label:{fontFamily:t.fonts.medium,fontSize:16,lineHeight:24,color:t.colors.primary,flexShrink:1},stepper:{flexDirection:'row',alignItems:'center',backgroundColor:t.colors.soft,borderRadius:t.radius.sm,borderWidth:1,borderColor:t.colors.border},button:{width:48,height:48,alignItems:'center',justifyContent:'center'},value:{minWidth:56,textAlign:'center',fontFamily:t.fonts.heading,fontSize:22,color:t.colors.primary},hint:{fontFamily:t.fonts.body,fontSize:14,lineHeight:22,color:t.colors.subtle}});
