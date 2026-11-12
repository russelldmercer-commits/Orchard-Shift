import { getSupabaseClient } from '@/template';
import { invokeBilling } from './membership';
export async function deleteAccount(ownerId: string, password: string) {
  const result = await invokeBilling<{ deleted: boolean }>('app-delete-account', { password, confirmation: 'DELETE' }, ownerId);
  if (result.error || result.data?.deleted !== true) return { error: result.error ?? 'Account deletion was not confirmed.' };
  return { error: null };
}
export async function clearDeletedSession(): Promise<string | null> {
  try { const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' }); return error ? 'Close and reopen the app to clear the deleted account session.' : null; }
  catch { return 'Close and reopen the app to clear the deleted account session.'; }
}
