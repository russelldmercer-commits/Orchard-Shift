import Tabs from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Sprout, Utensils, BookOpen, ShoppingBasket, SlidersHorizontal } from 'lucide-react-native';
import { theme as t } from '@/constants/theme';
export default function TabLayout() {
 const insets = useSafeAreaInsets();
 return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:t.colors.primary,tabBarInactiveTintColor:t.colors.subtle,tabBarLabelStyle:{fontFamily:t.fonts.medium,fontSize:11},tabBarStyle:{height:Platform.select({ios:insets.bottom+60,android:insets.bottom+60,default:70}),paddingTop:8,paddingBottom:Platform.select({ios:insets.bottom+8,android:insets.bottom+8,default:8}),paddingHorizontal:16,backgroundColor:t.colors.paper,borderTopWidth:1,borderTopColor:t.colors.border}}}>
 <Tabs.Screen name="index" options={{title:'Today',tabBarIcon:({color,size}) => <Sprout size={size} color={color}/>}}/>
 <Tabs.Screen name="plates" options={{title:'Plates',tabBarIcon:({color,size}) => <Utensils size={size} color={color}/>}}/>
 <Tabs.Screen name="learn" options={{title:'Learn',tabBarIcon:({color,size}) => <BookOpen size={size} color={color}/>}}/>
 <Tabs.Screen name="groceries" options={{title:'Shop',tabBarIcon:({color,size}) => <ShoppingBasket size={size} color={color}/>}}/>
 <Tabs.Screen name="you" options={{title:'You',tabBarIcon:({color,size}) => <SlidersHorizontal size={size} color={color}/>}}/>
 </Tabs>;
}
