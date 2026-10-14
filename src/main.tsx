import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Calibration from './Calibration';
import { CALIBRATE, INSET, RELOAD_HOURS } from './config';
import './styles.css';

/** Num quiosque ninguém vai apertar F5: se o React quebrar, recarrega sozinho. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    window.setTimeout(() => location.reload(), 10_000);
  }

  render() {
    return this.state.failed ? <div className="fatal">erro — recarregando…</div> : this.props.children;
  }
}

function scheduleReload(hours: number) {
  if (!(hours > 0)) return;
  const attempt = async () => {
    // servido por HTTP: só recarrega se o servidor responder, senão a tela ficaria em branco
    if (location.protocol !== 'file:') {
      try {
        const res = await fetch(location.href, { cache: 'no-store' });
        if (!res.ok) throw new Error();
      } catch {
        window.setTimeout(attempt, 60_000);
        return;
      }
    }
    location.reload();
  };
  window.setTimeout(attempt, hours * 3_600_000);
}

scheduleReload(RELOAD_HOURS);

INSET.forEach((px, i) => {
  document.documentElement.style.setProperty(`--inset-${['top', 'right', 'bottom', 'left'][i]}`, `${px}px`);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      {CALIBRATE && <Calibration />}
    </ErrorBoundary>
  </StrictMode>,
);
