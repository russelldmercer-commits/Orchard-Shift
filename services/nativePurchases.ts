import { NativeModules, Platform } from 'react-native';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { invokeBilling, type ServiceResult, type MembershipStatus } from './membership';
import { getSupabaseClient } from '@/template';
import { fetchReleaseAvailability } from './weeklyMeals';

interface NativeConfiguration { sdkKey: string; entitlementId: string; productId: string; platform: string }
export interface NativeOffer { priceString: string; currency: string; productId: string }
export interface NativePurchaseResult { cancelled: boolean; pending?: boolean }
type PurchasesSdk = typeof import('react-native-purchases').default;
let sdk: PurchasesSdk | null = null;
let configuration: NativeConfiguration | null = null;
let desiredOwner: string | null = null;
let identifiedOwner: string | null = null;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.then(() => undefined, () => undefined);
  return next;
}
class NativePurchaseError extends Error {}
async function assertOwner(ownerId: string) {
  if (desiredOwner !== ownerId) throw new NativePurchaseError('The account changed. Please try again from your membership screen.');
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || data.session?.user.id !== ownerId || desiredOwner !== ownerId) throw new NativePurchaseError('Please sign in again before managing purchases.');
}
async function ready(ownerId: string): Promise<PurchasesSdk> {
  await assertOwner(ownerId);
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new NativePurchaseError('Store purchasing requires an installed iOS or Android build.');
  // Import only after the module check: Live Preview and Expo Go must never crash or simulate purchases.
  if (!NativeModules.RNPurchases) throw new NativePurchaseError('Store purchasing is available in a new installed build, not this preview.');
  if (!configuration) {
    const result = await invokeBilling<NativeConfiguration>('app-native-config', { platform: Platform.OS }, ownerId);
    if (result.error || !result.data) throw new NativePurchaseError(result.error ?? 'Store configuration could not be loaded.');
    const config = result.data;
    const validKey = Platform.OS === 'ios' ? /^appl_[a-zA-Z0-9]+$/ : /^goog_[a-zA-Z0-9]+$/;
    if (config.platform !== Platform.OS || typeof config.sdkKey !== 'string' || !validKey.test(config.sdkKey) || !config.entitlementId || !config.productId) throw new NativePurchaseError('The public store configuration was rejected.');
    await assertOwner(ownerId);
    configuration = config; // Public SDK key only, memory-only in JS. Secret keys never reach this service.
  }
  if (!sdk) {
    try {
      const module = await import('react-native-purchases');
      const purchases = module.default;
      await purchases.setLogLevel(module.LOG_LEVEL.ERROR);
      await purchases.setLogHandler(() => {}); // Do not forward provider logs, IDs, receipts, or keys.
      await assertOwner(ownerId);
      purchases.configure({ apiKey: configuration.sdkKey, appUserID: ownerId });
      sdk = purchases;
      identifiedOwner = ownerId;
    } catch (error) {
      if (error instanceof NativePurchaseError) throw error;
      sdk = null;
      throw new NativePurchaseError('Store purchasing requires a rebuilt app with the purchasing module installed.');
    }
  }
  if (identifiedOwner !== ownerId) {
    await sdk.logIn(ownerId);
    identifiedOwner = ownerId;
  }
  await assertOwner(ownerId);
  if (await sdk.getAppUserID() !== ownerId) throw new NativePurchaseError('The purchase account could not be verified.');
  return sdk;
}
function failure<T>(error: unknown): ServiceResult<T> {
  if (error instanceof NativePurchaseError) return { data: null, error: error.message };
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = code === sdk?.PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR ? 'This purchase belongs to another account. Sign in to the original account to restore it.' : code === sdk?.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR ? 'Approval or payment is pending. Do not purchase again; return here once it is approved.' : 'The store could not complete this request. Check your store account and connection, then try again.';
  return { data: null, error: message };
}
export function setNativeAccount(ownerId: string | null): Promise<void> {
  desiredOwner = ownerId; // Invalidate in-flight UI/identity operations immediately, before queued SDK work.
  return serial(async () => {
    if (ownerId !== desiredOwner) return;
    if (!ownerId) {
      if (sdk) {
        try { if (!(await sdk.isAnonymous())) await sdk.logOut(); } catch { /* New actions remain blocked by desiredOwner. */ }
      }
      identifiedOwner = null;
      return;
    }
    // Do not trigger OS restore prompts or import the SDK during public browsing.
  });
}
async function monthlyPackage(purchases: PurchasesSdk): Promise<PurchasesPackage> {
  const offerings = await purchases.getOfferings();
  const pack = offerings.current?.monthly;
  if (!pack || !configuration || pack.product.identifier !== configuration.productId || pack.product.subscriptionPeriod !== 'P1M') throw new NativePurchaseError('The monthly membership is not available from the store yet. Please try again later.');
  if (pack.product.currencyCode === 'USD' && Math.abs(pack.product.price - 12.99) > 0.005) throw new NativePurchaseError('The store price does not match the $12.99 monthly membership. Purchasing has been paused.');
  return pack;
}
export function loadNativeOffer(ownerId: string): Promise<ServiceResult<NativeOffer>> {
  return serial(async () => {
    try {
      const purchases = await ready(ownerId);
      const pack = await monthlyPackage(purchases);
      await assertOwner(ownerId);
      return { data: { priceString: pack.product.priceString, currency: pack.product.currencyCode, productId: pack.product.identifier }, error: null };
    } catch (error) { return failure<NativeOffer>(error); }
  });
}
export function purchaseNativeMembership(ownerId: string): Promise<ServiceResult<NativePurchaseResult>> {
  return serial(async () => {
    try {
      const availability = await fetchReleaseAvailability();
      if (availability.error || !availability.data?.ready) throw new NativePurchaseError(availability.data?.message ?? 'New subscriptions are paused until weekly meals and release requirements are ready.');
      const purchases = await ready(ownerId);
      // Server check at purchase time prevents repeated charges after stale UI or delayed verification.
      const status = await invokeBilling<MembershipStatus>('app-native-subscription', { platform: Platform.OS }, ownerId);
      if (status.error || !status.data) throw new NativePurchaseError(status.error ?? 'Unable to verify your current membership.');
      if (status.data.subscribed) throw new NativePurchaseError('Your membership is already active. Use Manage subscription instead.');
      const customerInfo = await purchases.getCustomerInfo();
      if (configuration && customerInfo.entitlements.active[configuration.entitlementId]) throw new NativePurchaseError('The store already reports an active subscription. Restore or refresh instead of purchasing again.');
      const pack = await monthlyPackage(purchases);
      await assertOwner(ownerId);
      await purchases.purchasePackage(pack);
      await assertOwner(ownerId);
      // The SDK result is deliberately not an entitlement. The provider refreshes the authenticated server.
      return { data: { cancelled: false }, error: null };
    } catch (error) {
      if ((error as { userCancelled?: boolean })?.userCancelled || String((error as { code?: unknown })?.code) === sdk?.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { data: { cancelled: true }, error: null };
      if (String((error as { code?: unknown })?.code) === sdk?.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { data: { cancelled: false, pending: true }, error: null };
      return failure<NativePurchaseResult>(error);
    }
  });
}
export function restoreNativeMembership(ownerId: string): Promise<ServiceResult<NativePurchaseResult>> {
  return serial(async () => {
    try {
      const purchases = await ready(ownerId);
      await purchases.restorePurchases(); // Only called after an explicit Restore button press.
      await assertOwner(ownerId);
      return { data: { cancelled: false }, error: null };
    } catch (error) {
      if ((error as { userCancelled?: boolean })?.userCancelled) return { data: { cancelled: true }, error: null };
      return failure<NativePurchaseResult>(error);
    }
  });
}
export function watchNativePurchases(ownerId: string, onChange: () => void): () => void {
  let stopped = false;
  let activeSdk: PurchasesSdk | null = null;
  const listener = (_info: CustomerInfo) => { if (!stopped && desiredOwner === ownerId && identifiedOwner === ownerId) onChange(); };
  void serial(async () => {
    try {
      const purchases = await ready(ownerId);
      if (stopped) return;
      activeSdk = purchases;
      purchases.addCustomerInfoUpdateListener(listener);
    } catch { /* Membership screen exposes setup errors; no mock or local entitlement fallback. */ }
  });
  return () => { stopped = true; if (activeSdk) activeSdk.removeCustomerInfoUpdateListener(listener); };
}
export function storeManagementUrl(store?: string | null): string {
  if (store === 'app_store' || (!store && Platform.OS === 'ios')) return 'https://apps.apple.com/account/subscriptions';
  return 'https://play.google.com/store/account/subscriptions';
}
