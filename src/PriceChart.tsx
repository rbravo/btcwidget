import { useEffect, useRef, useState } from 'react';
import { formatInt } from './format';

interface Props {
  points: number[];
  /** "r,g,b" */
  rgb: string;
  locale: string;
}

const FONT = '600 11px system-ui, -apple-system, "Segoe UI", Roboto, "DejaVu Sans", sans-serif';
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const PAD_LEFT = 2;
const PAD_RIGHT = 7;

export default function PriceChart({ points, rgb, locale }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const { w, h } = size;
    if (!canvas || !w || !h) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = points.length;
    if (n < 2) return;

    let min = Infinity;
    let max = -Infinity;
    let iMin = 0;
    let iMax = 0;
    for (let i = 0; i < n; i++) {
      const v = points[i];
      if (v < min) (min = v), (iMin = i);
      if (v > max) (max = v), (iMax = i);
    }
    const span = max - min || max * 0.001 || 1;
    const plotW = w - PAD_LEFT - PAD_RIGHT;
    const plotH = h - PAD_TOP - PAD_BOTTOM;
    const x = (i: number) => PAD_LEFT + (i / (n - 1)) * plotW;
    const y = (v: number) => PAD_TOP + ((max - v) / span) * plotH;

    // referência: preço no início do período
    const y0 = Math.round(y(points[0])) + 0.5;
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y0);
    ctx.lineTo(w - PAD_RIGHT, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    const line = new Path2D();
    line.moveTo(x(0), y(points[0]));
    for (let i = 1; i < n; i++) line.lineTo(x(i), y(points[i]));

    const area = new Path2D(line);
    area.lineTo(x(n - 1), h);
    area.lineTo(x(0), h);
    area.closePath();
    const grad = ctx.createLinearGradient(0, PAD_TOP, 0, h);
    grad.addColorStop(0, `rgba(${rgb},0.32)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fill(area);

    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(line);

    // máxima e mínima do período
    ctx.font = FONT;
    ctx.fillStyle = 'rgba(232,234,237,0.7)';
    const label = (i: number, v: number, above: boolean) => {
      const text = formatInt(v, locale);
      const tw = ctx.measureText(text).width;
      const tx = Math.max(2, Math.min(w - tw - 2, x(i) - tw / 2));
      ctx.fillText(text, tx, above ? y(v) - 5 : y(v) + 13);
    };
    label(iMax, max, true);
    label(iMin, min, false);

    // ponto atual
    const lx = x(n - 1);
    const ly = y(points[n - 1]);
    ctx.fillStyle = `rgba(${rgb},0.25)`;
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [points, size, rgb, locale]);

  return (
    <div ref={wrapRef} className="chart-canvas">
      <canvas ref={canvasRef} />
    </div>
  );
}
