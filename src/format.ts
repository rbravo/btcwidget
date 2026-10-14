const formatters = new Map<string, Intl.NumberFormat>();

function nf(locale: string, digits: number) {
  const key = `${locale}:${digits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, f);
  }
  return f;
}

/** Separa "112,345" e ".67" para desenhar os centavos menores. */
export function splitPrice(value: number, locale: string) {
  let int = '';
  let dec = '';
  for (const part of nf(locale, 2).formatToParts(value)) {
    if (part.type === 'decimal' || part.type === 'fraction') dec += part.value;
    else int += part.value;
  }
  return { int, dec };
}

export function formatInt(value: number, locale: string) {
  return nf(locale, 0).format(value);
}

const sign = (v: number) => (v >= 0 ? '+' : '−');

export function formatSignedInt(value: number, locale: string, prefix: string) {
  return `${sign(value)}${prefix}${nf(locale, 0).format(Math.abs(value))}`;
}

export function formatPct(value: number, locale: string) {
  return `${nf(locale, 2).format(Math.abs(value))}%`;
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatTime(date: Date | number) {
  return timeFormat.format(date);
}
