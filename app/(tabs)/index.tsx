import { FlatList, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, layout } from '@/components/layout/Screen';
import { TodayHeader } from '@/components/feature/TodayHeader';
import { PlateCard } from '@/components/feature/PlateCard';
import { WeekDayCard } from '@/components/feature/WeekDayCard';
import { Note } from '@/components/ui/Primitives';
import { usePlans } from '@/hooks/usePlans';
import { theme as t } from '@/constants/theme';
import { Slot } from '@/services/content';
export default function TodayPage() {
 const p = usePlans(); const router = useRouter();
 const open = (id:string,day:number,slot:Slot) => router.push({pathname:'/plate',params:{id,day:String(day),week:String(p.week),slot}});
 const header = <View style={s.header}><TodayHeader {...p} lesson={p.nextLesson} openLesson={() => router.push({pathname:'/lesson',params:{id:p.nextLesson.id}})}/></View>;
 return <Screen title="Make today a little better." subtitle="Simple food. Small steps. Room to be you.">{p.weekly ? <FlatList key="week" data={p.weekDays} keyExtractor={item => item.name} style={layout.list} contentContainerStyle={layout.content} showsVerticalScrollIndicator={false} ListHeaderComponent={header} renderItem={({item}) => <WeekDayCard name={item.name} meals={item.meals} onOpen={(slot,id) => open(id,item.day,slot)} onServingsChange={p.setMealServings}/>} ItemSeparatorComponent={() => <View style={s.separator}/>} ListFooterComponent={<View style={s.footer}><Note/></View>}/> : <FlatList key="day" data={p.meals} keyExtractor={item => item.key} style={layout.list} contentContainerStyle={layout.content} showsVerticalScrollIndicator={false} ListHeaderComponent={header} renderItem={({item}) => <PlateCard plate={item.plate} slot={item.slot} servings={item.servings} onServingsChange={value => p.setMealServings(item.key,value)} onPress={() => open(item.plate.id,p.day,item.slot)} completed={item.completed} onComplete={() => p.toggleMeal(item.key)}/>} ItemSeparatorComponent={() => <View style={s.separator}/>} ListFooterComponent={<View style={s.footer}><Note/></View>}/>}</Screen>;
}
const s = StyleSheet.create({header:{marginBottom:t.space.lg},separator:{height:t.space.md},footer:{marginTop:t.space.lg}});
