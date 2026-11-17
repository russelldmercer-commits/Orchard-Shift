import { getSupabaseClient } from '@/template';
import { invokeBilling } from './membership';
export async function deleteAccount(ownerId: string, password: string) {
  const result = await invokeBilling<{ deleted: boolean }>('app-delete-account', { password, confirmation: 'DELETE' }, ownerId);
  if (result.error || result.data?.deleted !== true) return { error: result.error ?? 'Account deletion was not confirmed.' };
  return { error: null };
}
export async function clearDeletedSession(ownerId: string): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) return 'Close and reopen the app to clear the deleted account session.';
    if (!data.session || data.session.user.id !== ownerId) return null;
    const { error } = await client.auth.signOut({ scope: 'local' });
    return error ? 'Close and reopen the app to clear the deleted account session.' : null;
  } catch { return 'Close and reopen the app to clear the deleted account session.'; }
}
