import { useEffect, useState, type ReactNode } from 'react';
import { INSET } from './config';

const RULER = 60;

/**
 * Réguas em px a partir de cada borda da janela. O menor número que aparece inteiro em cada lado
 * é quanto a tela esconde ali. A linha vermelha marca a borda da janela, a verde tracejada o `inset` atual.
 */
export default function Calibration() {
  const [open, setOpen] = useState(true);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!open) return null;

  const { w, h } = size;
  const [top, right, bottom, left] = INSET;
  const ry = Math.round(h * 0.3) + 0.5;
  const rx = Math.round(w * 0.3) + 0.5;

  const ticks: ReactNode[] = [];
  const labels: ReactNode[] = [];
  for (let d = 0; d <= RULER; d += 5) {
    const len = d % 10 === 0 ? 7 : 3;
    const xl = d + 0.5;
    const xr = w - d - 0.5;
    const yt = d + 0.5;
    const yb = h - d - 0.5;
    ticks.push(
      <line key={`l${d}`} x1={xl} x2={xl} y1={ry - len} y2={ry + len} />,
      <line key={`r${d}`} x1={xr} x2={xr} y1={ry - len} y2={ry + len} />,
      <line key={`t${d}`} x1={rx - len} x2={rx + len} y1={yt} y2={yt} />,
      <line key={`b${d}`} x1={rx - len} x2={rx + len} y1={yb} y2={yb} />,
    );
    // número do lado de dentro da marca: só aparece inteiro se a marca também aparecer
    if (d && d % 10 === 0) {
      const ly = d % 20 ? ry - 9 : ry + 17;
      labels.push(
        <text key={`l${d}`} x={xl + 2} y={ly}>{d}</text>,
        <text key={`r${d}`} x={xr - 2} y={ly} textAnchor="end">{d}</text>,
        <text key={`t${d}`} x={rx + 10} y={yt + 9}>{d}</text>,
        <text key={`b${d}`} x={rx + 10} y={yb - 2}>{d}</text>,
      );
    }
  }

  return (
    <div className="calibrate" onClick={() => setOpen(false)}>
      <svg width={w} height={h}>
        <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" stroke="#ff3b30" />
        <rect
          x={left + 0.5}
          y={top + 0.5}
          width={Math.max(0, w - left - right - 1)}
          height={Math.max(0, h - top - bottom - 1)}
          fill="none"
          stroke="#16c784"
          strokeDasharray="4 3"
        />
        <g stroke="#e8eaed">
          <line x1={0} x2={RULER} y1={ry} y2={ry} />
          <line x1={w - RULER} x2={w} y1={ry} y2={ry} />
          <line x1={rx} x2={rx} y1={0} y2={RULER} />
          <line x1={rx} x2={rx} y1={h - RULER} y2={h} />
          {ticks}
        </g>
        <g fill="#e8eaed" fontSize={10}>
          {labels}
        </g>
      </svg>
      <div className="calibrate-info">
        <b>
          {w} × {h}
        </b>{' '}
        · dpr {window.devicePixelRatio}
        <br />
        inset atual: {INSET.join(',')}
        <br />
        Em cada borda, o menor número que aparece inteiro é quanto a tela esconde. Use{' '}
        <code>inset=topo,direita,base,esquerda</code>
        <br />
        <span className="muted">toque para fechar</span>
      </div>
    </div>
  );
}
