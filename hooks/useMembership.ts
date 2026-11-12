import { useContext } from 'react';
import { MembershipContext } from '@/contexts/MembershipContext';
export function useMembership() {
  const value = useContext(MembershipContext);
  if (!value) throw new Error('useMembership must be used within MembershipProvider');
  return value;
}
