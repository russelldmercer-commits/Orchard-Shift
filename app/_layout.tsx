import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Lora_600SemiBold } from '@expo-google-fonts/lora';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { AlertProvider, AuthProvider } from '@/template';
import { MembershipProvider } from '@/contexts/MembershipContext';
import { OrchardProvider } from '@/contexts/OrchardContext';
import { WeeklyMealsProvider } from '@/contexts/WeeklyMealsContext';
import { theme as t } from '@/constants/theme';
export default function RootLayout() {
 const [loaded,error] = useFonts({Lora_600SemiBold,DMSans_400Regular,DMSans_500Medium,DMSans_600SemiBold});
 return <AlertProvider><SafeAreaProvider><AuthProvider><OrchardProvider><MembershipProvider><WeeklyMealsProvider><StatusBar style="dark"/>{loaded || error ? <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:t.colors.paper},headerStyle:{backgroundColor:t.colors.paper},headerTintColor:t.colors.primary,headerTitleStyle:{fontFamily:t.fonts.heading},headerShadowVisible:false}}><Stack.Screen name="index"/><Stack.Screen name="(tabs)"/><Stack.Screen name="login" options={{headerShown:false}}/><Stack.Screen name="membership" options={{headerShown:true,title:'Membership'}}/><Stack.Screen name="payment-history" options={{headerShown:true,title:'Browser payment history'}}/><Stack.Screen name="membership-terms" options={{headerShown:true,title:'Subscription terms'}}/><Stack.Screen name="privacy" options={{headerShown:true,title:'Privacy information'}}/><Stack.Screen name="weekly-meals" options={{headerShown:true,title:'This week’s meals'}}/><Stack.Screen name="support" options={{headerShown:true,title:'Help & support'}}/><Stack.Screen name="delete-account" options={{headerShown:true,title:'Delete account'}}/><Stack.Screen name="plate" options={{headerShown:true,title:'Your flexible plate'}}/><Stack.Screen name="lesson" options={{headerShown:true,title:'A little more whole'}}/></Stack> : <View style={s.loading}><ActivityIndicator size="large" color={t.colors.primary}/></View>}</WeeklyMealsProvider></MembershipProvider></OrchardProvider></AuthProvider></SafeAreaProvider></AlertProvider>;
}
const s = StyleSheet.create({loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:t.colors.paper}});
