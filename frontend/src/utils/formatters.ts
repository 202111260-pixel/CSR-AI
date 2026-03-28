import { format } from 'date-fns';

/** Format an amount in Omani Rial */
export function formatOMR(amount: number): string {
  return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(amount);
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}
