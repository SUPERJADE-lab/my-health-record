import { useState } from "react";
import { fmtDate, today, addDays, avg } from "../util.js";
import { saveDaily } from "../db.js";
import { Panel, Seg, Num } from "../ui.jsx";
import Chart from "../Chart.jsx";

const FIELDS = [
  ["steps", "걸음 수", "걸음", "1"], ["sbp", "수축기 혈압", "mmHg", "1"], ["dbp", "이완기 혈압", "mmHg", "1"], ["pulse", "맥박", "회/분", "1"],
  ["weight", "체중", "kg"], ["lean", "제지방량", "kg"], ["smm", "골격근량", "kg"], ["fat", "체지방률", "%"], ["water_ml", "물 마신 양", "mL", "1"],
];

// 단축어가 복사한 글에서 값을 찾아요. 예: "날짜 2026-10-25 수축기 126 이완기 88 맥박 71"
const PASTE_KEYS = [["sbp", /수축기[^\d]*(\d+)/], ["dbp", /이완기[^\d]*(\d+)/], ["pulse", /(?:맥박|심박)[^\d]*(\d+)/],
  ["weight", /체중[^\d]*(\d+(?:\.\d+)?)/], ["steps", /걸음[^\d]*(\d+)/]];
export function parsePaste(text) {
  const out = {};
  PASTE_KEYS.forEach(([k, re]) => { const m = text.match(re); if (m) out[k] = m[1]; });
  const d = text.match(/(20\d\d)[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/);
  if (d) out.date = `${d[1]}-${d[2].padStart(2, "0")}-${d[3].padStart(2, "0")}`;
  return out;
}

function DayForm({ daily, onSaved }) {
  const [date, setDate] = useState(today());
  const [v, setV] = useState({}), [note, setNote] = useState("");
  const [st, setSt] = useState("빈 칸은 저장된 값을 그대로 둬요."), [bad, setBad] = useState([]), [busy, setBusy] = useState(false);
  const prev = daily.find(d => d.date === date);
  const [pasteBox, setPasteBox] = useState(false);
  function fill(text) {
    const p = parsePaste(text || "");
    const { date: pd, ...vals } = p;
    if (!Object.keys(vals).length) { setSt("복사한 내용에서 혈압이나 맥박을 찾지 못했어요. 단축어를 다시 실행해 주세요."); setPasteBox(true); return; }
    if (pd) setDate(pd);
    setV(x => ({ ...x, ...vals })); setPasteBox(false);
    setSt("붙여넣은 값을 채웠어요. 확인하고 저장을 눌러 주세요.");
  }
  async function paste() {
    try { fill(await navigator.clipboard.readText()); }
    catch { setPasteBox(true); setSt("아래 칸을 길게 눌러 붙여넣기 해 주세요."); }
  }
  async function submit(e) {
    e.preventDefault();
    const row = { date }, wrong = [];
    for (const [k] of FIELDS) {
      const s = String(v[k] ?? "").trim();
      if (s === "") { if (prev?.[k] != null) row[k] = prev[k]; continue; }
      const n = +s; if (isNaN(n) || n < 0) wrong.push(k); else row[k] = n;
    }
    row.note = note.trim() || prev?.note || null;
    setBad(wrong);
    if (wrong.length) { setSt("빨간 칸에 음수나 숫자가 아닌 값이 있어요."); return; }
    if (Object.keys(row).length <= 2 && !note.trim()) { setSt("넣을 값을 하나 이상 적어 주세요."); return; }
    setBusy(true);
    try { await saveDaily(row); setV({}); setNote(""); setSt(`${fmtDate(date)} 기록을 저장했어요.`); await onSaved(); }
    catch (err) { setSt("저장하지 못했어요. " + err.message); }
    setBusy(false);
  }
  return <form onSubmit={submit} autoComplete="off">
    <div className="actions">
      <button type="button" className="btn ghost" onClick={paste}>단축어 값 붙여넣기</button>
      <span className="status">건강 앱 단축어를 실행한 뒤 누르면 혈압·맥박이 채워져요.</span>
    </div>
    {pasteBox && <label>여기에 붙여넣기<textarea rows="2" className="paste" onChange={e => fill(e.target.value)} placeholder="길게 눌러 붙여넣기" /></label>}
    <div className="grid-in">
      <label>날짜<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
      {FIELDS.map(([k, label, unit, step]) => <Num key={k} label={label} unit={unit} step={step || "any"} bad={bad.includes(k)}
        value={v[k] ?? ""} onChange={x => setV({ ...v, [k]: x })} />)}
    </div>
    <label>메모<input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={prev?.note || "예: 두통, 붓기, 컨디션"} /></label>
    {prev && <p className="note">이 날 저장된 값: {FIELDS.filter(([k]) => prev[k] != null).map(([k, l, u]) => `${l} ${prev[k]}${u === "걸음" ? "" : u}`).join(" · ") || "없음"}</p>}
    <div className="actions"><button className="btn" disabled={busy}>이 날 기록 저장</button><span className="status">{st}</span></div>
  </form>;
}

export default function Daily({ data, refresh }) {
  const [range, setRange] = useState(90);
  const from = range ? addDays(today(), -range) : "0000";
  const rows = data.daily.filter(d => d.date >= from);
  const pts = k => rows.filter(d => d[k] != null).map(d => ({ d: d.date, v: d[k] }));
  const st = rows.filter(r => r.steps != null);
  const bp = rows.filter(r => r.sbp != null);
  return <>
    <header className="page-head"><div className="eyebrow">DAILY</div><h1>일상 기록</h1>
      <p className="lede">걸음 수, 혈압, 체중을 날짜별로 모아 봐요. 아이폰에서는 홈 화면에 추가해 두면 매일 넣기 편해요.</p></header>

    <Panel title="하루 기록 넣기"><DayForm daily={data.daily} onSaved={refresh} /></Panel>

    <div className="range-bar"><Seg value={range} onChange={setRange} options={[[30, "30일"], [90, "90일"], [365, "1년"], [0, "전체"]]} /></div>
    <div className="grid2">
      <Panel title="걸음 수" hint={st.length ? `하루 평균 ${Math.round(avg(st.map(r => r.steps))).toLocaleString()}걸음 · ${st.length}일` : ""}>
        <Chart bars series={[{ points: pts("steps"), color: "var(--accent)" }]} height={220} />
      </Panel>
      <Panel title="혈압 · 맥박" hint={bp.length ? `평균 ${Math.round(avg(bp.map(r => r.sbp)))}/${Math.round(avg(bp.filter(r => r.dbp != null).map(r => r.dbp)))}` : ""}>
        <Chart band={[60, 120]} series={[{ points: pts("sbp"), color: "var(--high)" }, { points: pts("dbp"), color: "var(--low)" }, { points: pts("pulse"), color: "var(--muted)" }]} height={220} />
        <p className="note"><span className="lg"><i style={{ background: "var(--high)" }} />수축기</span><span className="lg"><i style={{ background: "var(--low)" }} />이완기</span><span className="lg"><i style={{ background: "var(--muted)" }} />맥박</span> 옅은 띠는 일반 기준 60~120이에요.</p>
      </Panel>
      <Panel title="체중"><Chart series={[{ points: pts("weight"), color: "var(--accent)" }]} height={220} /></Panel>
      <Panel title="물 마신 양" hint="mL"><Chart bars series={[{ points: pts("water_ml"), color: "var(--low)" }]} height={220} empty="물 마신 양을 넣으면 여기에 보여요." /></Panel>
    </div>
  </>;
}
