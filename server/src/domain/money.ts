import { BillingFrequency } from './types';

export class MoneyUtil {
  public static toMonthlyEquivalentCents(cents: number, freq: BillingFrequency): number {
    if (freq === 'YEARLY') return Math.round(cents / 12);
    if (freq === 'WEEKLY') return Math.round((cents * 52) / 12);
    return cents;
  }
  public static format(cents: number, currency = 'USD'): string {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    return `${sign}$${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, '0')} ${currency}`;
  }
}
