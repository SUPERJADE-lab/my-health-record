import { flag } from "./items.js";

export function Panel({ title, hint, actions, children, className = "" }) {
  return <section className={"panel " + className}>
    {(title || hint || actions) && <div className="panel-head">
      <h2>{title}</h2>
      {hint && <span className="hint">{hint}</span>}
      {actions}
    </div>}
    {children}
  </section>;
}

export function Value({ it, v, arrow = true }) {
  if (v == null || v === "") return <span className="muted">·</span>;
  const f = flag(it, v);
  if (!f) return <>{v}</>;
  return <span className={"pill " + f}>{v}{arrow && !it.text ? (f === "high" ? " ▲" : " ▼") : ""}</span>;
}

// 이전 대비 변화. 좋고 나쁨은 판단하지 않고 방향만 보여줘요.
export function Delta({ c, unit = "" }) {
  if (!c) return <span className="delta muted">이전 기록 없음</span>;
  if (c.d === 0) return <span className="delta">이전과 같음</span>;
  return <span className="delta">{c.d > 0 ? "▲" : "▼"} {Math.abs(c.d)}{unit}{c.pct != null ? ` (${c.pct > 0 ? "+" : ""}${c.pct}%)` : ""}</span>;
}

export function Seg({ value, options, onChange }) {
  return <div className="seg" role="group">
    {options.map(([v, label]) => <button key={v} type="button" className={v === value ? "on" : ""} onClick={() => onChange(v)}>{label}</button>)}
  </div>;
}

export function Num({ label, unit, value, onChange, step = "any", bad }) {
  return <label><span>{label}{unit && <span className="u"> ({unit})</span>}</span>
    <input type="number" step={step} min="0" inputMode="decimal" className={bad ? "bad" : ""} value={value ?? ""} onChange={e => onChange(e.target.value)}
      onWheel={e => e.currentTarget.blur()} />
  </label>;
}
