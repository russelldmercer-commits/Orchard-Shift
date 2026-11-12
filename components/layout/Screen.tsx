import { ReactNode } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { theme as t, assets } from '@/constants/theme';
import { useOrchard } from '@/hooks/useOrchard';
interface ScreenProps { children: ReactNode; title?: string; subtitle?: string; detail?: boolean }
export function Screen({children,title,subtitle,detail = false}: ScreenProps) {
 const {ready,storageError} = useOrchard();
 return <SafeAreaView edges={detail ? ['bottom'] : ['top']} style={s.safe}><KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={s.frame}>{title ? <View style={s.header}><View style={s.brand}><Image source={{uri:assets.mark}} style={s.mark} contentFit="contain" transition={200}/><Text style={s.brandText}>orchard shift</Text><View style={s.device}><Text style={s.deviceText}>ON DEVICE</Text></View></View><Text style={s.title}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View> : null}{storageError ? <Text accessibilityRole="alert" style={s.error}>{storageError}</Text> : null}{ready ? children : <View style={s.loading}><ActivityIndicator color={t.colors.primary}/><Text style={s.subtitle}>Opening your orchard…</Text></View>}</View></KeyboardAvoidingView></SafeAreaView>;
}
export const layout = StyleSheet.create({ content:{paddingHorizontal:t.space.lg,paddingBottom:t.space.xl,gap:t.space.lg}, list:{flex:1}, columns:{gap:t.space.md} });
const s = StyleSheet.create({safe:{flex:1,backgroundColor:t.colors.paper},frame:{flex:1,width:'100%',maxWidth:960,alignSelf:'center'},header:{paddingHorizontal:t.space.lg,paddingTop:t.space.md,paddingBottom:t.space.lg,gap:t.space.sm},brand:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:t.space.md},mark:{width:27,height:32},brandText:{fontFamily:t.fonts.heading,fontSize:20,color:t.colors.primary},device:{marginLeft:'auto',paddingVertical:6,paddingHorizontal:8,borderRadius:8,backgroundColor:t.colors.soft},deviceText:{fontFamily:t.fonts.bold,fontSize:9,letterSpacing:1,color:t.colors.primary},title:{fontFamily:t.fonts.heading,fontSize:32,lineHeight:42,color:t.colors.ink},subtitle:{fontFamily:t.fonts.body,fontSize:16,lineHeight:25,color:t.colors.subtle},error:{padding:t.space.md,fontFamily:t.fonts.body,color:t.colors.danger,fontSize:14},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:t.space.md}});
