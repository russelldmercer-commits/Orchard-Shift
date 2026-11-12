import { useEffect, useMemo, useState } from 'react';
import { fetchReleaseAvailability, type ReleaseInformation } from '@/services/weeklyMeals';
import { membershipInformation, type MembershipInformationKind } from '@/services/membershipInformation';
export function useMembershipInformation(kind: MembershipInformationKind) {
  const [operator, setOperator] = useState<ReleaseInformation | null>(null);
  useEffect(() => { let active = true; void fetchReleaseAvailability().then(result => { if (active) setOperator(result.data?.information ?? null); }); return () => { active = false; }; }, []);
  return useMemo(() => { const content = membershipInformation(kind); return { ...content, sections: [...content.sections, { id: 'operator', title: 'Operator and contact', body: operator ? `${operator.legalName}\n${operator.supportEmail}\nPrivacy: ${operator.privacyUrl}\nAccount deletion: ${operator.deletionUrl}` : 'Operator contact details are awaiting configuration. These policy screens require operator review before store submission.' }] }; },[kind, operator]);
}
