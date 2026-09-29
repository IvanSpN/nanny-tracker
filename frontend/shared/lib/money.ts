const formatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

/** «4 000 тг» — неразрывный пробел, чтобы «тг» не переносилось отдельно. */
export function formatMoney(value: number) {
  return `${formatter.format(value)} тг`;
}

export function formatHours(value: number) {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
}
