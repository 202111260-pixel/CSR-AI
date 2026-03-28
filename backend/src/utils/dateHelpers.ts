/**
 * Shared date utility functions used across multiple route files.
 */

export interface MonthRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns an array of month ranges for the last N months (including current).
 * Each entry contains start/end dates and a formatted label.
 */
export function getLastNMonths(n: number, labelOptions?: Intl.DateTimeFormatOptions): MonthRange[] {
  const months: MonthRange[] = [];
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = labelOptions ?? { month: 'short' };
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleString('en-US', opts);
    months.push({ start, end, label });
  }
  return months;
}

/**
 * Returns an array of month ranges for the next N months (starting from next month).
 */
export function getNextNMonths(n: number, labelOptions?: Intl.DateTimeFormatOptions): MonthRange[] {
  const months: MonthRange[] = [];
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = labelOptions ?? { month: 'short' };
  for (let i = 1; i <= n; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleString('en-US', opts);
    months.push({ start, end, label });
  }
  return months;
}
