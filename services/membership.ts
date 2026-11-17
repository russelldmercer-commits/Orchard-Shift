import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import { Platform } from 'react-native';

export interface MembershipStatus {
  subscribed: boolean;
  entitled: boolean;
  provider?: 'revenuecat';
  store?: 'app_store' | 'play_store' | null;
  tier: string | null;
  status: string;
  subscription_end: string | null;
  cancel_at_period_end: boolean;
  billing_mode: 'test' | 'live';
  has_customer: boolean;
  checkout_ready: boolean;
  amount: number;
  currency: string;
  interval: string;
}
export interface ServiceResult<T> { data: T | null; error: string | null }
export async function invokeBilling<T>(name: string, body: Record<string, unknown>, expectedOwnerId?: string): Promise<ServiceResult<T>> {
  try {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) return { data: null, error: 'Please sign in before using membership billing.' };
    if (expectedOwnerId && sessionData.session.user.id !== expectedOwnerId) return { data: null, error: 'The account changed. Please reload your payment history.' };
    const { data, error } = await client.functions.invoke(name, { body, headers: { Authorization: `Bearer ${sessionData.session.access_token}` } });
    if (error) {
      let message = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context.text();
          let detail = '';
          try { const payload = JSON.parse(text); detail = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string' ? payload.message : ''; } catch { detail = ''; }
          message = `[${error.context.status}] ${detail || 'The billing service could not complete this request.'}`;
        } catch { message = 'The billing service returned an unreadable error. Please try again.'; }
      }
      return { data: null, error: message };
    }
    if (!data || data.error) return { data: null, error: typeof data?.error === 'string' ? data.error : 'No billing response was received.' };
    return { data: data as T, error: null };
  } catch { return { data: null, error: 'Unable to reach membership billing. Check your connection and try again.' }; }
}
export async function fetchMembership(expectedOwnerId?: string): Promise<ServiceResult<MembershipStatus>> {
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  const result = await invokeBilling<MembershipStatus>(native ? 'app-native-subscription' : 'app-check-subscription', native ? { platform: Platform.OS } : {}, expectedOwnerId);
  if (result.error || !result.data) return result;
  const status = result.data;
  const validEnd = typeof status.subscription_end === 'string' && Number.isFinite(Date.parse(status.subscription_end));
  if (typeof status.subscribed !== 'boolean' || typeof status.entitled !== 'boolean' || typeof status.status !== 'string' || !/^[a-z_]{1,40}$/.test(status.status) || typeof status.checkout_ready !== 'boolean' || typeof status.has_customer !== 'boolean' || typeof status.cancel_at_period_end !== 'boolean' || (status.tier !== null && typeof status.tier !== 'string') || (status.subscription_end !== null && !validEnd) || !['test','live'].includes(status.billing_mode) || status.amount !== 1299 || status.currency !== 'usd' || status.interval !== 'month' || (native && (status.provider !== 'revenuecat' || ![null, 'app_store', 'play_store'].includes(status.store ?? null) || (status.subscribed && (!validEnd || !status.store || !status.has_customer)))) || (status.billing_mode === 'test' && status.entitled) || (status.entitled && !status.subscribed)) return { data: null, error: 'The membership response could not be verified.' };
  return result;
}
export async function createBillingUrl(type: 'checkout' | 'portal', platform: string): Promise<ServiceResult<{url: string}>> {
  const result = await invokeBilling<{url: string}>(type === 'checkout' ? 'app-create-checkout' : 'app-customer-portal', { platform });
  if (result.error || !result.data) return result;
  const url = result.data.url;
  // Only Stripe-hosted destinations may be opened by the client.
  const safe = typeof url === 'string' && (type === 'checkout' ? /^https:\/\/checkout\.stripe\.com\//.test(url) : /^https:\/\/billing\.stripe\.com\//.test(url));
  return safe ? result : { data: null, error: 'An unexpected billing destination was rejected.' };
}
