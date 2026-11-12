import { Redirect } from 'expo-router';
import { AuthRouter } from '@/template';
export default function IndexPage() {
  // Free device content stays public. Billing endpoints independently verify sessions.
  return <AuthRouter loginRoute="/login" excludeRoutes={['/']}><Redirect href="/(tabs)"/></AuthRouter>;
}
