// Pure visibility rule for already downloaded content. This never grants server access.
interface WeeklyAccessStatus {
  provider?: string;
  subscribed: boolean;
  entitled: boolean;
  billing_mode: 'live' | 'test';
  subscription_end: string | null;
}
export function canViewWeeklyContent(
  status: WeeklyAccessStatus | null,
  environment: 'live' | 'test',
  checkedAt: string | null,
  now = Date.now(),
): boolean {
  if (!status || status.provider !== 'revenuecat' || !status.subscribed || status.billing_mode !== environment) return false;
  if (environment === 'live' && !status.entitled) return false;
  const end = Date.parse(status.subscription_end ?? '');
  const checked = Date.parse(checkedAt ?? '');
  // Membership is polled every minute. Expired, failed or stale checks hide memory-only recipes.
  return Number.isFinite(end) && end > now && Number.isFinite(checked) && checked <= now && now - checked < 90000;
}
