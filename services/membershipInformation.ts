import { legalInformation } from '@/supabase/functions/_shared/legalInformation';
export interface MembershipInformationSection { id: string; title: string; body: string }
export type MembershipInformationKind = 'terms' | 'privacy';
export function membershipInformation(kind: MembershipInformationKind): { title: string; sections: MembershipInformationSection[] } {
  return legalInformation(kind);
}
