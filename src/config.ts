export const CURRENCIES = {
  USD: { symbol: 'BTCUSDT', label: 'BTC/USD', prefix: '$', locale: 'en-US' },
  BRL: { symbol: 'BTCBRL', label: 'BTC/BRL', prefix: 'R$', locale: 'pt-BR' },
} as const;

export type CurrencyId = keyof typeof CURRENCIES;
export const CURRENCY_IDS = Object.keys(CURRENCIES) as CurrencyId[];

export interface Timeframe {
  id: string;
  /** intervalo do candle na Binance */
  interval: string;
  /** quantos candles cobrem o período */
  limit: number;
  /** duração de um candle em ms */
  ms: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const TIMEFRAMES: readonly Timeframe[] = [
  { id: '1H', interval: '1m', limit: 60, ms: MIN },
  { id: '24H', interval: '5m', limit: 288, ms: 5 * MIN },
  { id: '7D', interval: '1h', limit: 168, ms: HOUR },
  { id: '30D', interval: '4h', limit: 180, ms: 4 * HOUR },
  { id: '1A', interval: '1d', limit: 365, ms: 24 * HOUR },
];
export const TIMEFRAME_IDS = TIMEFRAMES.map((t) => t.id);

export const UP_RGB = '22,199,132';
export const DOWN_RGB = '234,57,67';
export const FLAT_RGB = '138,145,158';

const params = new URLSearchParams(location.search);

/** Se o parâmetro aparecer mais de uma vez, vale o último (o kiosk.sh põe os padrões antes). */
function param(key: string): string | null {
  const values = params.getAll(key);
  return values.length ? values[values.length - 1] : null;
}

const STORAGE_PREFIX = 'btcwidget.';

function stored(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function remember(key: string, value: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // sem storage (modo anônimo, etc.): só não lembra a escolha
  }
}

/** Escolha salva por toque > parâmetro da URL > padrão. */
export function initialSetting<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  for (const value of [stored(key), param(key)?.toUpperCase()]) {
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  }
  return fallback;
}

/** Recarrega a página a cada N horas para manter o Chromium "limpo" rodando 24/7. `?reload=0` desliga. */
export const RELOAD_HOURS = Number(param('reload') ?? 12);

/**
 * Margem extra em px para telas que escondem parte do framebuffer (borda cortada pelo painel ou pela case).
 * Mesmo formato do padding do CSS: `20`, `0,20` (vertical,horizontal) ou `0,20,0,0` (topo,direita,base,esquerda).
 */
export const INSET = parseInset(param('inset'));

/** `?calibrate=1` mostra réguas nas bordas para medir quanto a tela corta. */
export const CALIBRATE = param('calibrate') != null;

function parseInset(value: string | null): [number, number, number, number] {
  const n = (value ?? '').split(',').map(Number).filter(Number.isFinite);
  const [top = 0, right = top, bottom = top, left = right] = n;
  return [top, right, bottom, left];
}
