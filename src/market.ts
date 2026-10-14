import { useEffect, useState } from 'react';
import type { Timeframe } from './config';

export interface Candle {
  t: number;
  o: number;
  c: number;
}

export interface Ticker {
  symbol: string;
  /** último preço */
  c: number;
  /** preço de 24h atrás */
  o: number;
}

export type Status = 'connecting' | 'live' | 'reconnecting' | 'offline';

/** Endpoints públicos de market data da Binance; o segundo é fallback. */
const HOSTS = [
  { rest: 'https://data-api.binance.vision', ws: 'wss://data-stream.binance.vision' },
  { rest: 'https://api.binance.com', ws: 'wss://stream.binance.com:9443' },
];

/** Sem mensagem nesse tempo = conexão morta, mesmo que o socket diga que está aberto. */
const STALE_MS = 20_000;
/** Recarrega o histórico periodicamente para corrigir buracos. */
const HISTORY_REFRESH_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

let preferredHost = 0;

async function fetchCandles(rest: string, symbol: string, tf: Timeframe, signal: AbortSignal) {
  const url = `${rest}/api/v3/klines?symbol=${symbol}&interval=${tf.interval}&limit=${tf.limit}`;
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as [number, string, string, string, string][];
  return rows.map((r): Candle => ({ t: r[0], o: +r[1], c: +r[4] }));
}

export function useMarket(symbol: string, tf: Timeframe) {
  const key = `${symbol}:${tf.id}`;
  const [series, setSeries] = useState<{ key: string; candles: Candle[] }>({ key: '', candles: [] });
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const stream = symbol.toLowerCase();
    let disposed = false;
    let candles: Candle[] = [];
    let ws: WebSocket | null = null;
    let wsHost = preferredHost;
    let restHost = preferredHost;
    let failures = 0;
    let historyFailures = 0;
    let everOpened = false;
    let lastMsgAt = 0;
    let lastHistoryAt = 0;
    let historyCtrl: AbortController | null = null;
    let reconnectTimer: number | undefined;

    setStatus('connecting');

    const publish = () => setSeries({ key, candles });

    const loadHistory = () => {
      if (disposed || historyCtrl) return;
      const ctrl = new AbortController();
      historyCtrl = ctrl;
      const timeout = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      fetchCandles(HOSTS[restHost].rest, symbol, tf, ctrl.signal)
        .then((rows) => {
          if (disposed || !rows.length) return;
          candles = rows;
          lastHistoryAt = Date.now();
          historyFailures = 0;
          publish();
        })
        .catch(() => {
          historyFailures++;
          if (historyFailures % 2 === 0) restHost = (restHost + 1) % HOSTS.length;
        })
        .finally(() => {
          clearTimeout(timeout);
          if (historyCtrl === ctrl) historyCtrl = null;
        });
    };

    const applyKline = (k: { t: number; o: string; c: string }) => {
      if (!candles.length) return;
      const candle: Candle = { t: k.t, o: +k.o, c: +k.c };
      const last = candles[candles.length - 1];
      if (candle.t === last.t) {
        candles = candles.slice();
        candles[candles.length - 1] = candle;
      } else if (candle.t > last.t) {
        const gap = candle.t - last.t > tf.ms;
        candles = candles.slice(candles.length >= tf.limit ? 1 : 0);
        candles.push(candle);
        if (gap) loadHistory();
      } else {
        return;
      }
      publish();
    };

    const onMessage = (ev: MessageEvent) => {
      lastMsgAt = Date.now();
      let data;
      try {
        data = JSON.parse(ev.data).data;
      } catch {
        return;
      }
      if (!data) return;
      if (data.e === '24hrMiniTicker') {
        failures = 0;
        setTicker({ symbol, c: +data.c, o: +data.o });
        setUpdatedAt(lastMsgAt);
        setStatus('live');
      } else if (data.e === 'kline') {
        applyKline(data.k);
      }
    };

    const drop = (sock: WebSocket) => {
      sock.onopen = sock.onmessage = sock.onclose = sock.onerror = null;
      try {
        sock.close();
      } catch {
        // já fechado
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      ws = null;
      failures++;
      if (failures % 2 === 0) wsHost = (wsHost + 1) % HOSTS.length;
      setStatus(failures >= 4 ? 'offline' : 'reconnecting');
      clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(connect, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1)));
    };

    const connect = () => {
      if (disposed) return;
      const host = wsHost;
      let sock: WebSocket;
      try {
        sock = new WebSocket(`${HOSTS[host].ws}/stream?streams=${stream}@miniTicker/${stream}@kline_${tf.interval}`);
      } catch {
        scheduleReconnect();
        return;
      }
      ws = sock;
      lastMsgAt = Date.now();
      sock.onopen = () => {
        preferredHost = host;
        // reconectou depois de uma queda: completa o buraco no gráfico
        if (everOpened) loadHistory();
        everOpened = true;
      };
      sock.onmessage = onMessage;
      sock.onerror = () => sock.close();
      sock.onclose = () => {
        if (ws === sock) scheduleReconnect();
      };
    };

    const watchdog = window.setInterval(() => {
      const now = Date.now();
      if (ws && now - lastMsgAt > STALE_MS) {
        drop(ws);
        scheduleReconnect();
      }
      if (!candles.length || now - lastHistoryAt > HISTORY_REFRESH_MS) loadHistory();
    }, 5_000);

    // a rede voltou: não espera o backoff
    const onOnline = () => {
      if (ws || disposed) return;
      failures = 0;
      clearTimeout(reconnectTimer);
      connect();
    };
    window.addEventListener('online', onOnline);

    loadHistory();
    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      clearInterval(watchdog);
      window.removeEventListener('online', onOnline);
      historyCtrl?.abort();
      if (ws) drop(ws);
    };
  }, [symbol, tf, key]);

  return {
    candles: series.key === key ? series.candles : [],
    ticker: ticker && ticker.symbol === symbol ? ticker : null,
    status,
    updatedAt,
  };
}
