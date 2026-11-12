import { getSupabaseClient } from '@/template';
export async function sendRecoveryCode(email: string): Promise<{error: string | null}> {
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  } catch { return { error: 'Unable to request a recovery code. Please try again.' }; }
}
export async function recoverWithCode(email: string, code: string, password: string): Promise<{error: string | null}> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (error) return { error: error.message };
    if (!data.user || !data.session) return { error: 'No recovery session was returned.' };
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) return { error: updateError.message };
    return { error: null };
  } catch { return { error: 'Unable to reset the password. Please try again.' }; }
}
