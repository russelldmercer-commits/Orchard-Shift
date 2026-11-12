import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Leaf, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMembership } from '@/hooks/useMembership';
import { membership } from '@/constants/membership';
import { theme as t } from '@/constants/theme';
import { ui } from '@/components/ui/Primitives';
interface MembershipCardProps { compact?: boolean }
export const MembershipCard = memo(function MembershipCard({compact = false}: MembershipCardProps) {
  const { status } = useMembership();
  const router = useRouter();
  return <Pressable accessibilityRole="button" accessibilityLabel="View Orchard Shift membership" onPress={() => router.push('/membership')} style={({pressed}) => [s.card,{opacity:pressed ? 0.75 : 1,transform:[{scale:pressed ? 0.99 : 1}]}]}>
    <View style={s.top}><Leaf size={22} color={t.colors.primary}/><Text style={s.label}>ORCHARD SHIFT · MEMBERSHIP</Text><ArrowRight size={20} color={t.colors.primary}/></View>
    <View style={s.top}><Text style={s.price}>{membership.displayPrice}<Text style={s.unit}> USD / month</Text></Text></View>
    <Text style={ui.body}>{status?.subscribed ? status.billing_mode === 'test' ? 'Sandbox subscription · not a live membership' : 'Your membership is active' : 'New meal collections, every week.'}</Text>
    {!compact ? <Text style={ui.subtle}>Seven days of new recipes, flexible servings, and a weekly shopping list. View membership, restore purchases or manage your subscription.</Text> : null}
  </Pressable>;
});
const s = StyleSheet.create({card:{backgroundColor:t.colors.soft,padding:t.space.lg,borderRadius:t.radius.md,gap:t.space.md,borderWidth:1,borderColor:t.colors.border},top:{flexDirection:'row',alignItems:'center',gap:t.space.sm},label:{flex:1,fontFamily:t.fonts.bold,fontSize:11,lineHeight:18,letterSpacing:1,color:t.colors.citrus},price:{fontFamily:t.fonts.heading,fontSize:32,lineHeight:42,color:t.colors.primary},unit:{fontFamily:t.fonts.medium,fontSize:16,lineHeight:26,color:t.colors.primary}});
