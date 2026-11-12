import { useRef } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshCw, Clock, Check, ArrowLeft } from 'lucide-react-native';
import { Screen, layout } from '@/components/layout/Screen';
import { Chip, Button, Note, Section, ui } from '@/components/ui/Primitives';
import { PlateCard } from '@/components/feature/PlateCard';
import { ServingControl } from '@/components/feature/ServingControl';
import { PortionGuide } from '@/components/feature/PortionGuide';
import { usePlateDetail } from '@/hooks/usePlates';
import { useLayout } from '@/hooks/useLayout';
import { days, Slot } from '@/services/content';
import { theme as t } from '@/constants/theme';

export default function PlatePage() {
  const params = useLocalSearchParams<{id:string;week?:string;day?:string;slot?:Slot}>();
  const p = usePlateDetail(params.id,params);
  const router = useRouter();
  const {wide} = useLayout();
  const listRef = useRef<FlatList>(null);
  return <Screen detail><FlatList
    ref={listRef}
    key={wide ? 'wide' : 'phone'}
    data={p.options}
    numColumns={wide ? 2 : 1}
    columnWrapperStyle={wide ? layout.columns : undefined}
    keyExtractor={item => item.id}
    style={layout.list}
    contentContainerStyle={[layout.content,s.content]}
    showsVerticalScrollIndicator={false}
    ListHeaderComponent={<View style={s.header}>
      <Image source={{uri:p.plate.image}} contentFit="cover" transition={200} style={s.image}/>
      <Text style={ui.label}>{p.plate.style.toUpperCase()} · FLEXIBLE RECIPE SERVINGS</Text>
      <Text style={s.title}>{p.plate.name}</Text>
      <Text style={ui.body}>{p.plate.description}</Text>
      <View style={ui.row}><Clock size={18} color={t.colors.citrus}/><Text style={ui.body}>{p.plate.minutes} minutes for the base recipe</Text></View>
      <View style={s.portionPanel}>
        <ServingControl value={p.servings} onChange={p.setServings} hint="Adjust from 0.25 to 8 in quarter-serving steps. Ingredients and nutrition below update together. Preview only until you choose Use for your plan."/>
        <Text style={ui.subtle}>One recipe serving is the original recipe quantity, not a recommended portion for every person. Use this control for smaller portions, extra food, or sharing.</Text>
      </View>
      <View style={ui.gap}><Text style={s.totalLabel}>ESTIMATED TOTALS · {p.servings} RECIPE SERVINGS</Text><View style={s.nutrients}>
        <View style={s.nutrient}><Text style={s.value}>~{p.plate.kcal}</Text><Text style={s.nutrientLabel}>kcal</Text></View>
        <View style={s.nutrient}><Text style={s.value}>{p.plate.protein}g</Text><Text style={s.nutrientLabel}>protein</Text></View>
        <View style={s.nutrient}><Text style={s.value}>{p.plate.fiber}g</Text><Text style={s.nutrientLabel}>fiber</Text></View>
      </View><Text style={ui.subtle}>Recipe totals, not per person when shared. Nutrients scale proportionally from illustrative base estimates.</Text></View>
      <View style={s.choose}>
        <Text style={s.cardTitle}>Make room in your plan</Text>
        <View style={s.chips}><Chip title="Week 1" selected={p.week === 0} onPress={() => p.setWeek(0)}/><Chip title="Week 2" selected={p.week === 1} onPress={() => p.setWeek(1)}/>{p.plate.slot === 'Main' ? <><Chip title="Lunch" selected={p.actualSlot === 'Lunch'} onPress={() => p.setSlot('Lunch')}/><Chip title="Dinner" selected={p.actualSlot === 'Dinner'} onPress={() => p.setSlot('Dinner')}/></> : <Text style={ui.subtle}>Breakfast</Text>}</View>
        <View style={s.days}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayChips}>{days.map((name,index) => <Chip key={name} title={name.slice(0,3)} selected={p.day === index} onPress={() => p.setDay(index)}/>)}</ScrollView></View>
        <Button title={`Use ${p.servings} servings for ${days[p.day]} ${p.actualSlot.toLowerCase()}`} icon={<Check size={18} color={t.colors.surface}/>} onPress={() => {p.select();router.replace('/');}}/>
        <Text style={ui.subtle}>Updates Week {p.week+1}, {days[p.day]} {p.actualSlot.toLowerCase()} and its linked grocery quantities. Changes clear only that week’s shopping checkmarks. Selecting another day or meal slot loads its saved servings.</Text>
      </View>
      <PortionGuide protein={p.plate.protein}/>
      {p.swaps.length ? <View style={s.swapPanel}><View style={ui.row}><RefreshCw size={20} color={t.colors.citrus}/><Text style={s.cardTitle}>Not your favorite? Try a swap.</Text></View>{p.swaps.map(swap => <View key={swap.name} style={ui.gap}><Text style={s.swapTitle}>Instead of {swap.name}</Text><Text style={ui.body}>{swap.ideas.length ? swap.ideas.join(' · or · ') : 'Choose another complete meal below.'}</Text></View>)}<Text style={ui.subtle}>Swap ideas only; recipes and shopping quantities do not change automatically. Nutrient estimates apply to the original ingredients at your selected servings, not substitutions.</Text></View> : null}
      <Section title="What goes in" caption={`Total ingredients for ${p.servings} recipe servings`}/>
      {p.ingredients.map(item => <View key={item.name} style={s.ingredient}><Text style={s.ingredientName}>{item.name}</Text><Text style={ui.subtle}>{item.quantityLabel} {item.unit}</Text></View>)}
      <Note text="Fractional items may need cutting, weighing, or reserving leftovers. Larger batches may need larger cookware and adjusted cooking time; check safe internal temperatures rather than multiplying time."/>
      <Section title="Bring it together"/>
      {p.plate.steps.map((step,index) => <View key={index} style={s.step}><View style={s.stepNumber}><Text style={s.stepNumberText}>{index+1}</Text></View><Text style={[ui.body,s.stepText]}>{step}</Text></View>)}
      <Note text="Nutrition figures are illustrative estimates, not a laboratory analysis. Ingredients and portions affect actual energy, protein, and fiber. Review labels for allergens."/>
      <Section title="Different flavor. Similar balance." caption={`${p.options.length} alternatives at ${p.servings} recipe servings each, ranked by estimated energy, protein, fiber, and your taste. Tap to compare, then choose one for your plan.`}/>
      <Note text="Alternatives share a meal role, but are not nutritionally identical. Compare the values shown; higher-protein meals may have no close equivalent in this collection."/>
    </View>}
    renderItem={({item}) => <View style={s.cell}><PlateCard compact plate={item} servings={p.servings} onPress={() => {p.setSelectedId(item.id);listRef.current?.scrollToOffset({offset:0,animated:true});}}/></View>}
    ItemSeparatorComponent={() => <View style={s.separator}/>}
    ListFooterComponent={<View style={s.footer}><Button secondary title="Back to my daily path" icon={<ArrowLeft size={18} color={t.colors.primary}/>} onPress={() => router.replace('/')}/><Note/></View>}
  /></Screen>;
}
const s = StyleSheet.create({
  content:{paddingTop:t.space.lg},header:{gap:t.space.lg,marginBottom:t.space.lg},image:{width:'100%',height:280,borderRadius:t.radius.lg},title:{fontFamily:t.fonts.heading,fontSize:32,lineHeight:42,color:t.colors.primary},portionPanel:{padding:t.space.md,backgroundColor:t.colors.surface,borderWidth:1,borderColor:t.colors.border,borderRadius:t.radius.md,gap:t.space.md},totalLabel:{fontFamily:t.fonts.bold,fontSize:12,lineHeight:18,letterSpacing:1,color:t.colors.citrus},nutrients:{flexDirection:'row',backgroundColor:t.colors.soft,borderRadius:t.radius.md,paddingVertical:t.space.lg},nutrient:{flex:1,alignItems:'center',gap:6},value:{fontFamily:t.fonts.heading,fontSize:24,color:t.colors.primary},nutrientLabel:{fontFamily:t.fonts.body,fontSize:14,color:t.colors.subtle},choose:{backgroundColor:t.colors.surface,padding:t.space.md,borderRadius:t.radius.md,borderWidth:1,borderColor:t.colors.border,gap:t.space.md},cardTitle:{fontFamily:t.fonts.heading,fontSize:20,lineHeight:28,color:t.colors.primary,flexShrink:1},chips:{flexDirection:'row',alignItems:'center',gap:t.space.sm,flexWrap:'wrap'},days:{minHeight:48},dayChips:{flexDirection:'row',alignItems:'center',gap:t.space.sm},swapPanel:{backgroundColor:t.colors.soft,padding:t.space.lg,borderRadius:t.radius.md,gap:t.space.md},swapTitle:{fontFamily:t.fonts.bold,fontSize:16,color:t.colors.citrus},ingredient:{flexDirection:'row',justifyContent:'space-between',gap:t.space.md,paddingBottom:t.space.sm,borderBottomWidth:1,borderColor:t.colors.border},ingredientName:{fontFamily:t.fonts.body,fontSize:16,color:t.colors.ink,flex:1,textTransform:'capitalize'},step:{flexDirection:'row',alignItems:'flex-start',gap:t.space.md},stepNumber:{width:32,height:32,backgroundColor:t.colors.soft,borderRadius:16,alignItems:'center',justifyContent:'center'},stepNumberText:{fontFamily:t.fonts.bold,fontSize:14,color:t.colors.primary},stepText:{flex:1},cell:{flex:1},separator:{height:t.space.md},footer:{marginTop:t.space.lg,gap:t.space.lg}
});
