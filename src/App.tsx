import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CURRENCIES,
  CURRENCY_IDS,
  DOWN_RGB,
  FLAT_RGB,
  TIMEFRAMES,
  TIMEFRAME_IDS,
  UP_RGB,
  initialSetting,
  remember,
  type CurrencyId,
} from './config';
import { formatPct, formatSignedInt, formatTime, splitPrice } from './format';
import { useMarket, type Status } from './market';
import PriceChart from './PriceChart';

const STATUS_TEXT: Record<Status, string> = {
  connecting: 'conectando',
  live: 'ao vivo',
  reconnecting: 'reconectando',
  offline: 'offline',
};

function useClock() {
  const [now, setNow] = useState(() => formatTime(Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(formatTime(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Pisca o preço em verde/vermelho a cada mudança. */
function useTickFlash(price: number | null, resetKey: string) {
  const prev = useRef<{ key: string; price: number | null }>({ key: resetKey, price: null });
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const last = prev.current;
    prev.current = { key: resetKey, price };
    if (price == null || last.price == null || last.key !== resetKey || last.price === price) return;
    setFlash(price > last.price ? 'up' : 'down');
    const id = window.setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(id);
  }, [price, resetKey]);
  return flash;
}

export default function App() {
  const [currencyId, setCurrencyId] = useState<CurrencyId>(() => initialSetting('currency', CURRENCY_IDS, 'USD'));
  const [tfId, setTfId] = useState(() => initialSetting('tf', TIMEFRAME_IDS, '24H'));
  const currency = CURRENCIES[currencyId];
  const tf = TIMEFRAMES.find((t) => t.id === tfId) ?? TIMEFRAMES[1];

  const { candles, ticker, status, updatedAt } = useMarket(currency.symbol, tf);
  const clock = useClock();

  const price = ticker?.c ?? (candles.length ? candles[candles.length - 1].c : null);
  const flash = useTickFlash(price, currencyId);

  // o último ponto do gráfico acompanha o preço ao vivo
  const points = useMemo(() => {
    const p = candles.map((c) => c.c);
    if (p.length && ticker) p[p.length - 1] = ticker.c;
    return p;
  }, [candles, ticker]);

  const base = candles.length ? candles[0].o : null;
  const change = price != null && base ? price - base : null;
  const trend = change == null ? 'flat' : change >= 0 ? 'up' : 'down';
  const rgb = trend === 'up' ? UP_RGB : trend === 'down' ? DOWN_RGB : FLAT_RGB;

  const toggleCurrency = () => {
    const next = CURRENCY_IDS[(CURRENCY_IDS.indexOf(currencyId) + 1) % CURRENCY_IDS.length];
    setCurrencyId(next);
    remember('currency', next);
  };

  const selectTf = (id: string) => {
    setTfId(id);
    remember('tf', id);
  };

  const parts = price != null ? splitPrice(price, currency.locale) : null;

  return (
    <div className="app">
      <header className="top">
        <button className="pair" onClick={toggleCurrency}>
          <span className="btc">₿</span> {currency.label}
        </button>
        <span className={`status ${status}`}>
          <i className="dot" />
          {STATUS_TEXT[status]}
          {status !== 'live' && updatedAt ? ` · ${formatTime(updatedAt)}` : ''}
        </span>
        <span className="clock">{clock}</span>
      </header>

      <section className="quote" onClick={toggleCurrency}>
        <div className={`price ${flash ?? ''} ${status === 'live' ? '' : 'stale'}`}>
          <span className="sym">{currency.prefix}</span>
          {parts ? (
            <>
              {parts.int}
              <span className="dec">{parts.dec}</span>
            </>
          ) : (
            '—'
          )}
        </div>
        <div className={`change ${trend}`}>
          <div className="pct">
            {change != null && base ? `${change >= 0 ? '▲' : '▼'} ${formatPct((change / base) * 100, currency.locale)}` : '—'}
          </div>
          <div className="abs">
            {change != null ? `${formatSignedInt(change, currency.locale, currency.prefix)} · ` : ''}
            {tf.id}
          </div>
        </div>
      </section>

      <div className="chart">
        <PriceChart points={points} rgb={rgb} locale={currency.locale} />
        {points.length < 2 && <div className="chart-msg">carregando…</div>}
      </div>

      <nav className="tfs">
        {TIMEFRAMES.map((t) => (
          <button key={t.id} className={t.id === tf.id ? 'active' : ''} onClick={() => selectTf(t.id)}>
            {t.id}
          </button>
        ))}
      </nav>
    </div>
  );
}
