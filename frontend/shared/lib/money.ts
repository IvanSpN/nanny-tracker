const formatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number) {
  return formatter.format(value);
}

export function formatHours(value: number) {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
}
