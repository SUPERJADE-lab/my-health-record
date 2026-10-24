import { fmtDate } from "./util.js";

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

// 날짜 간격에 비례해서 점을 놓는 그래프.
// series: [{points:[{d,v}], color, label}], band: [lo|null, hi|null], target: {v,label}, markers: [날짜], bars, labels(점마다 값 표시)
export default function Chart({ series, band, target, markers = [], bars, labels, from, to, height = 240, empty = "아직 기록이 없어요." }) {
  const all = series.flatMap(s => s.points);
  if (!all.length) return <div className="chart-empty">{empty}</div>;
  const W = 720, H = height, L = 52, R = 18, T = 20, B = 34;
  const ts = all.map(p => Date.parse(p.d));
  // from/to가 있으면 그 기간 전체를 가로축으로 써요
  let t0 = Math.min(...ts, ...(from ? [Date.parse(from)] : [])), t1 = Math.max(...ts, ...(to ? [Date.parse(to)] : []));
  if (t0 === t1) { t0 -= 864e5 * 15; t1 += 864e5 * 15; }
  const x = d => L + (W - L - R) * (Date.parse(d) - t0) / (t1 - t0);
  let vals = all.map(p => p.v);
  if (band) band.forEach(b => b != null && vals.push(b));
  if (target) vals.push(target.v);
  let mn = bars ? 0 : Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  if (!bars) { const pad = (mx - mn) * 0.12; mn = Math.max(0, mn - pad); mx += pad; }
  const step = niceStep((mx - mn) / 4); mn = Math.floor(mn / step) * step; mx = Math.ceil(mx / step) * step;
  const y = v => T + (H - T - B) * (1 - (v - mn) / (mx - mn));
  const grid = []; for (let v = mn; v <= mx + 1e-9; v += step) grid.push(v);
  // 날짜 눈금: 첫날, 마지막 날, 그 사이 3개
  const span = t1 - t0;
  const ticks = [0, .25, .5, .75, 1].map(f => new Date(t0 + span * f).toISOString().slice(0, 10));
  const bw = Math.max(1.5, Math.min(12, (W - L - R) / Math.max(1, span / 864e5) * 0.7));
  const hasBand = band && (band[0] != null || band[1] != null);
  const bHi = hasBand ? y(band[1] != null ? Math.min(band[1], mx) : mx) : 0;
  const bLo = hasBand ? y(band[0] != null ? Math.max(band[0], mn) : mn) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img">
      {hasBand && <rect x={L} y={bHi} width={W - L - R} height={Math.max(0, bLo - bHi)} fill="var(--band)" />}
      {grid.map(v => <g key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
        <text x={L - 8} y={y(v) + 4} textAnchor="end" className="ax">{v >= 10000 ? v / 1000 + "k" : +v.toFixed(2)}</text>
      </g>)}
      {markers.filter(d => { const t = Date.parse(d); return t >= t0 && t <= t1; }).map((d, i) =>
        <line key={"m" + i} x1={x(d)} x2={x(d)} y1={H - B} y2={H - B - 8} stroke="var(--violet)" strokeWidth="2" />)}
      {target && <g>
        <line x1={L} x2={W - R} y1={y(target.v)} y2={y(target.v)} stroke="var(--violet)" strokeDasharray="6 5" strokeWidth="1.6" />
        <text x={W - R} y={y(target.v) - 6} textAnchor="end" className="ax" fill="var(--violet)">{target.label}</text>
      </g>}
      {series.map((s, i) => {
        const p = s.points; if (!p.length) return null;
        if (bars) return <g key={i}>{p.map(q => <rect key={q.d} x={x(q.d) - bw / 2} y={y(q.v)} width={bw} height={y(mn) - y(q.v)} rx="1" fill={s.color} />)}</g>;
        const last = p[p.length - 1];
        return <g key={i}>
          <polyline fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" points={p.map(q => x(q.d) + "," + y(q.v)).join(" ")} />
          {p.length <= 60 && p.map(q => <circle key={q.d} cx={x(q.d)} cy={y(q.v)} r="3.5" fill="var(--surface)" stroke={q.color || s.color} strokeWidth="2" />)}
          <circle cx={x(last.d)} cy={y(last.v)} r="5" fill={last.color || s.color} />
          {labels && p.map(q => <text key={"l" + q.d} x={x(q.d)} y={y(q.v) - 10} textAnchor="middle" className="val" fill={q.color || s.color}>{q.v}</text>)}
        </g>;
      })}
      {[...new Set(ticks)].map((d, i) => <text key={d} x={x(d)} y={H - 12} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} className="ax">{fmtDate(d).slice(2)}</text>)}
    </svg>
  );
}
