// Ported from catcheez-mobile.html seedCandles() so the chart shape matches the frontend.
export interface Candle { t: number; open: number; high: number; low: number; close: number; }

export function seedCandles(endPrice: number, up: boolean, n = 34): Candle[] {
  const arr: Candle[] = [];
  const start = endPrice * (up ? 0.74 : 0.93);
  let p = start;
  const total = endPrice - start;
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const o = p;
    const drift = total / n + (Math.random() - 0.45) * endPrice * 0.02;
    const c = Math.max(endPrice * 0.45, o + drift);
    const hi = Math.max(o, c) + Math.random() * endPrice * 0.013;
    const lo = Math.min(o, c) - Math.random() * endPrice * 0.012;
    arr.push({ t: now - (n - i) * 3600_000, open: r(o), high: r(hi), low: r(lo), close: r(c) });
    p = c;
  }
  const last = arr[n - 1];
  last.close = r(endPrice);
  last.high = r(Math.max(last.high, endPrice));
  last.low = r(Math.min(last.low, endPrice));
  return arr;
}
const r = (x: number) => Math.round(x * 1e6) / 1e6;
