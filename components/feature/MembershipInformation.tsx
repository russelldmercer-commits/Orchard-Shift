import { memo, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, type ListRenderItem } from 'react-native';
import { Screen, layout } from '@/components/layout/Screen';
import { ui } from '@/components/ui/Primitives';
import type { MembershipInformationKind, MembershipInformationSection } from '@/services/membershipInformation';
import { useMembershipInformation } from '@/hooks/useMembershipInformation';
import { theme as t } from '@/constants/theme';
interface MembershipInformationProps { kind: MembershipInformationKind }
export const MembershipInformation = memo(function MembershipInformation({ kind }: MembershipInformationProps) {
  const information = useMembershipInformation(kind);
  const renderSection = useCallback<ListRenderItem<MembershipInformationSection>>(({ item }) => <View style={s.panel}><Text style={ui.heading}>{item.title}</Text><Text style={ui.body}>{item.body}</Text></View>,[]);
  return <Screen detail><FlatList style={layout.list} contentContainerStyle={layout.content} data={information.sections} renderItem={renderSection} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} ListHeaderComponent={<View style={s.hero}><Text style={s.eyebrow}>ORCHARD SHIFT · MEMBERSHIP</Text><Text style={s.title}>{information.title}</Text></View>}/></Screen>;
});
const s = StyleSheet.create({ hero:{backgroundColor:t.colors.soft,padding:t.space.lg,borderRadius:t.radius.lg,gap:t.space.md},eyebrow:{fontFamily:t.fonts.bold,fontSize:12,lineHeight:20,color:t.colors.citrus,letterSpacing:1,includeFontPadding:false},title:{fontFamily:t.fonts.heading,fontSize:30,lineHeight:40,color:t.colors.primary,includeFontPadding:false},panel:{padding:t.space.lg,borderRadius:t.radius.md,backgroundColor:t.colors.surface,borderWidth:1,borderColor:t.colors.border,gap:t.space.md} });
