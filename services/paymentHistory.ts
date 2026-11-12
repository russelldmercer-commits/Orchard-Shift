import { invokeBilling } from './membership';
import type { ServiceResult } from './membership';

export type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible';
export interface AppInvoice {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  currency: 'usd';
  created_at: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  total: number;
  amount_paid: number;
  amount_remaining: number;
  credited_after_payment: number;
}
export interface PaymentHistoryPage {
  invoices: AppInvoice[];
  next_cursor: string | null;
  has_more: boolean;
  has_customer: boolean;
  billing_mode: 'test' | 'live';
  checked_at: string;
}
export interface InvoiceView {
  id: string;
  number: string;
  status: InvoiceStatus;
  statusLabel: string;
  amountLabel: string;
  totalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  creditLabel: string | null;
  issuedLabel: string;
  paidDateLabel: string | null;
  periodLabel: string | null;
}
const statuses: Record<InvoiceStatus, string> = { paid: 'Paid', open: 'Awaiting payment', void: 'Void', uncollectible: 'Uncollectible' };
function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function isInvoice(value: unknown): value is AppInvoice {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && /^in_[a-zA-Z0-9]+$/.test(item.id) &&
    (item.number === null || typeof item.number === 'string') && typeof item.status === 'string' && Object.prototype.hasOwnProperty.call(statuses, item.status) &&
    item.currency === 'usd' && isDate(item.created_at) &&
    [item.paid_at, item.period_start, item.period_end].every(date => date === null || isDate(date)) &&
    [item.total, item.amount_paid, item.amount_remaining, item.credited_after_payment].every(amount => typeof amount === 'number' && Number.isSafeInteger(amount));
}
export async function fetchAppPaymentHistory(ownerId: string, cursor: string | null = null): Promise<ServiceResult<PaymentHistoryPage>> {
  const response = await invokeBilling<PaymentHistoryPage>('app-payment-history', { cursor }, ownerId);
  if (response.error || !response.data) return response;
  const page = response.data;
  if (!Array.isArray(page.invoices) || page.invoices.length > 20 || !page.invoices.every(isInvoice) ||
    !['test', 'live'].includes(page.billing_mode) || typeof page.has_customer !== 'boolean' || typeof page.has_more !== 'boolean' || !isDate(page.checked_at) ||
    !(page.next_cursor === null || (typeof page.next_cursor === 'string' && /^in_[a-zA-Z0-9]+$/.test(page.next_cursor))) ||
    (page.has_more && !page.next_cursor)) return { data: null, error: 'The APP payment history response could not be verified. Please try again.' };
  return response;
}
export function formatUsd(cents: number): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100); }
  catch { return `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`; }
}
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
export function invoiceView(invoice: AppInvoice): InvoiceView {
  return {
    id: invoice.id,
    number: invoice.number ?? 'APP membership invoice',
    status: invoice.status,
    statusLabel: statuses[invoice.status],
    amountLabel: formatUsd(invoice.status === 'paid' ? invoice.amount_paid : invoice.total),
    totalLabel: formatUsd(invoice.total),
    paidLabel: formatUsd(invoice.amount_paid),
    remainingLabel: formatUsd(invoice.amount_remaining),
    creditLabel: invoice.credited_after_payment > 0 ? formatUsd(invoice.credited_after_payment) : null,
    issuedLabel: formatDate(invoice.created_at),
    paidDateLabel: invoice.paid_at ? formatDate(invoice.paid_at) : null,
    periodLabel: invoice.period_start && invoice.period_end ? `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}` : null,
  };
}
export function mergeAppInvoices(current: AppInvoice[], incoming: AppInvoice[]): AppInvoice[] {
  const byId = new Map(current.map(invoice => [invoice.id, invoice]));
  incoming.forEach(invoice => byId.set(invoice.id, invoice));
  return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
}
