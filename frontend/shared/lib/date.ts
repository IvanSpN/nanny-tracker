const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});

const shortWeekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
});

const fullWeekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
});

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7);
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDayRange(start: Date, end: Date) {
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function formatDay(value: Date) {
  return formatter.format(value);
}

export function formatShortWeekday(value: Date) {
  return shortWeekdayFormatter.format(value).replace('.', '');
}

export function formatFullWeekday(value: Date) {
  return fullWeekdayFormatter.format(value);
}

export function isWeekend(value: Date) {
  const day = value.getDay();

  return day === 0 || day === 6;
}
