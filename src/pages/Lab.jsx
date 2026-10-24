import { useMemo, useRef, useState } from "react";
import { GROUPS, flag, refText } from "../items.js";
import { fmtDate, change } from "../util.js";
import { saveVisit, deleteVisit } from "../db.js";
import { Panel, Value, Delta } from "../ui.jsx";
import Chart from "../Chart.jsx";

const DEPTS = ["신장내과", "산부인과", "건강검진", "기타", "확인 필요"];

export function itemHistory(visits, k) {
  return visits.filter(v => v.values?.[k] != null && v.values[k] !== "").sort((a, b) => a.date.localeCompare(b.date));
}
export function ItemChart({ visits, it, height }) {
  const hist = itemHistory(visits, it.k);
  if (it.text) return hist.length
    ? <div className="text-hist">{hist.map(v => <div key={v.id || v.date}><span className="mono">{fmtDate(v.date)}</span><Value it={it} v={v.values[it.k]} /></div>)}
      <p className="note">문자로 나오는 결과라 그래프 대신 날짜별로 보여드려요.</p></div>
    : <div className="chart-empty">{it.n} 결과가 아직 없어요.</div>;
  const points = hist.map(v => {
    const f = flag(it, v.values[it.k]);
    return { d: v.date, v: +v.values[it.k], color: f === "high" ? "var(--high)" : f === "low" ? "var(--low)" : undefined };
  });
  return <Chart series={[{ points, color: "var(--accent)" }]} band={[it.lo, it.hi]} labels height={height} empty={`${it.n} 수치가 아직 없어요.`} />;
}

function Form({ items, editing, onDone }) {
  const blank = { date: "", dept: "신장내과", values: {} };
  const [f, setF] = useState(editing || blank);
  const [status, setStatus] = useState(""), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const [bad, setBad] = useState([]);
  const key = editing?.id || "new";
  const last = useRef(key);
  if (last.current !== key) { last.current = key; setF(editing || blank); setConfirm(false); setStatus(""); setBad([]); }

  const setV = (k, s) => setF(p => ({ ...p, values: { ...p.values, [k]: s } }));
  async function submit(e) {
    e.preventDefault();
    const values = {}, wrong = [];
    for (const [k, raw] of Object.entries(f.values)) {
      const s = String(raw ?? "").trim(); if (s === "") continue;
      if (items[k].text) { values[k] = s.replace(/\s*\/HPF$/i, ""); continue; }
      const n = +s; if (isNaN(n) || n < 0) { wrong.push(k); continue; } values[k] = n;
    }
    setBad(wrong);
    if (wrong.length) { setStatus(`저장하지 않았어요. ${wrong.map(k => items[k].n).join(", ")} 값을 확인해 주세요.`); return; }
    setBusy(true);
    try { const saved = await saveVisit({ ...f, values }); setStatus(`${fmtDate(f.date)} 기록을 저장했어요.`); await onDone(saved); }
    catch (err) { setStatus("저장하지 못했어요. " + (err.code === "23505" ? "같은 날짜·진료과 기록이 이미 있어요." : err.message)); }
    setBusy(false);
  }
  async function del() {
    setBusy(true);
    try { await deleteVisit(editing.id); await onDone(null); setStatus("삭제했어요."); } catch (err) { setStatus("삭제하지 못했어요. " + err.message); }
    setBusy(false);
  }
  return <form onSubmit={submit} autoComplete="off">
    <div className="row">
      <label>검사일<input type="date" required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
      <label>진료과<select value={f.dept} onChange={e => setF({ ...f, dept: e.target.value })}>{DEPTS.map(d => <option key={d}>{d}</option>)}</select></label>
    </div>
    {GROUPS.map(g => <fieldset key={g.name}><legend>{g.name}</legend><div className="grid-in">
      {g.items.map(({ k }) => { const it = items[k]; return <label key={k}><span>{it.n} <span className="u">({it.text ? `예: ${it.ok[0]}, +, +++` : it.u})</span></span>
        <input type={it.text ? "text" : "number"} step="any" inputMode={it.text ? "text" : "decimal"} className={bad.includes(k) ? "bad" : ""}
          value={f.values[k] ?? ""} onChange={e => setV(k, e.target.value)} onWheel={e => e.currentTarget.blur()} /></label>; })}
    </div></fieldset>)}
    <div className="actions">
      <button className="btn" disabled={busy}>기록 저장</button>
      <button className="btn ghost" type="button" onClick={() => onDone(undefined)}>새로 쓰기</button>
      {editing && !confirm && <button className="btn danger" type="button" onClick={() => { setConfirm(true); setStatus("한 번 더 누르면 이 날짜 기록이 지워져요."); }}>이 날짜 기록 삭제</button>}
      {editing && confirm && <button className="btn danger" type="button" onClick={del} disabled={busy}>정말 삭제하기</button>}
      <span className="status">{status || "빈 칸은 그날 안 한 검사로 남겨두면 돼요."}</span>
    </div>
  </form>;
}

// 참고범위 이탈 현황: 벗어난 비율 60점 + 최근 값이 범위 밖으로 나간 정도 40점. 의학적 위험도 순위가 아니에요.
function OutOfRange({ visits, items, onPick }) {
  const rows = [];
  for (const it of Object.values(items)) {
    if (!it.text && it.lo == null && it.hi == null) continue;
    const hist = itemHistory(visits, it.k); if (!hist.length) continue;
    const out = hist.filter(v => flag(it, v.values[it.k])).length; if (!out) continue;
    const last = hist[hist.length - 1], lv = last.values[it.k];
    let dev = 0;
    if (!it.text) { if (it.hi != null && lv > it.hi) dev = (lv - it.hi) / it.hi; else if (it.lo != null && lv < it.lo) dev = (it.lo - lv) / it.lo; }
    else if (flag(it, lv)) dev = 0.3;
    rows.push({ it, n: hist.length, out, last, lv, score: out / hist.length * 60 + Math.min(dev, 1) * 40 });
  }
  rows.sort((a, b) => b.score - a.score);
  if (!rows.length) return <div className="chart-empty">참고범위를 벗어난 항목이 없어요.</div>;
  return <ul className="out-list">{rows.map(r => <li key={r.it.k}>
    <button className="link" onClick={() => onPick(r.it.k)}>{r.it.n}</button>
    <span><b>{r.n}번 중 {r.out}번</b> 벗어남 · 최근 <Value it={r.it} v={r.lv} /> <small className="muted">({fmtDate(r.last.date)})</small></span>
  </li>)}</ul>;
}

export default function Lab({ data, items, refresh }) {
  const visits = data.visits;
  const [sel, setSel] = useState("cr");
  const [editing, setEditing] = useState(null);
  const recs = useMemo(() => [...visits].sort((a, b) => b.date.localeCompare(a.date)), [visits]);
  const chartRef = useRef(null), formRef = useRef(null);
  const it = items[sel];

  const pick = k => { setSel(k); chartRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  const edit = v => { setEditing(v); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <>
    <header className="page-head"><div className="eyebrow">서울아산병원 검사결과</div><h1>검사 기록</h1>
      <p className="lede">항목 이름을 누르면 그래프가, 날짜를 누르면 수정 화면이 열려요. 그래프는 실제 날짜 간격대로 그려져요.</p></header>

    <Panel title="항목별 기록" hint={`검사 ${recs.length}회`}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>검사 항목</th><th>참고치</th><th>최근 변화</th>
          {recs.map(r => <th key={r.id} className="date"><button type="button" onClick={() => edit(r)}>{fmtDate(r.date)}<small>{r.dept}</small></button></th>)}</tr></thead>
        <tbody>{GROUPS.map(g => [
          <tr className="group" key={g.name}><td colSpan={3 + recs.length}>{g.name}</td></tr>,
          ...g.items.map(({ k }) => {
            const i = items[k], h = itemHistory(visits, k);
            const c = !i.text && h.length > 1 ? change(h[h.length - 1].values[k], h[h.length - 2].values[k]) : null;
            return <tr key={k} className={k === sel ? "sel" : ""}>
              <td className="name"><button type="button" onClick={() => pick(k)}>{i.n}</button></td>
              <td className="ref">{refText(i)} {i.u && <small>{i.u}</small>}{i.custom && <span className="gen">직접 입력</span>}</td>
              <td className="ref">{c ? <Delta c={c} /> : ""}</td>
              {recs.map(r => <td key={r.id} className="v"><Value it={i} v={r.values?.[k]} /></td>)}
            </tr>;
          })])}</tbody>
      </table></div>
    </Panel>

    <div ref={chartRef}><Panel title={it.n + " 추이"} hint={`참고치 ${refText(it)} ${it.u}`}><ItemChart visits={visits} it={it} /></Panel></div>

    <div ref={formRef}><Panel title={editing ? `${fmtDate(editing.date)} 기록 수정` : "새 검사 기록 추가"}>
      <Form items={items} editing={editing} onDone={async saved => { if (saved !== undefined) await refresh(); setEditing(saved || null); }} />
    </Panel></div>

    <Panel title="참고범위 이탈 현황" hint="기록이 바뀌면 자동으로 다시 정렬돼요">
      <p className="note">지금까지 검사 중 참고범위를 벗어난 비율과 가장 최근 값이 벗어난 정도로 정렬했어요. 의학적인 위험도 순서가 아니니, 진료 때 담당 선생님과 상의해 주세요.</p>
      <OutOfRange visits={visits} items={items} onPick={pick} />
    </Panel>
  </>;
}
