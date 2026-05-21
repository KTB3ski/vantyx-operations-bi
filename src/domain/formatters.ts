export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const wholeCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const oneDecimalPercentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(
  value: number,
  currencyDisplay: 'cents' | 'whole' = 'cents',
) {
  const formatter =
    currencyDisplay === 'whole' ? wholeCurrencyFormatter : currencyFormatter;
  return formatter.format(value || 0);
}

export function formatPercent(value: number, decimals: 1 | 2 = 2) {
  const formatter =
    decimals === 1 ? oneDecimalPercentFormatter : percentFormatter;
  return formatter.format(value || 0);
}

export function formatSignedCurrency(
  value: number,
  currencyDisplay: 'cents' | 'whole' = 'cents',
) {
  if (Math.abs(value) < 0.005) return formatCurrency(0, currencyDisplay);
  return `${value > 0 ? '+' : ''}${formatCurrency(value, currencyDisplay)}`;
}

export function formatDateTime(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function toPercentInput(value: number | null) {
  if (value === null || Number.isNaN(value)) return '';
  return Number((value * 100).toFixed(4)).toString();
}

export function fromPercentInput(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 100 : null;
}
