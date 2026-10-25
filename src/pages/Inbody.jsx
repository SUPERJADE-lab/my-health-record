import { useState } from "react";
import { saveInbody, deleteVisit } from "../db.js";
import { fmtDate, today, change } from "../util.js";
import { Panel, Seg, Num, Delta } from "../ui.jsx";
import Chart from "../Chart.jsx";

// 인바디 앱 '상세' 화면 순서 그대로. main: 목록 카드에서 지난번 대비 변화를 보여줄 항목
export const INBODY_FIELDS = [
  ["weight", "체중", "kg", true], ["smm", "골격근량", "kg", true], ["bfm", "체지방량", "kg", true],
  ["bmi", "BMI", "kg/m²", true], ["pbf", "체지방률", "%", true], ["whr", "복부지방률", "", true],
  ["vfl", "내장지방레벨", "Lv", true], ["bmr", "기초대사량", "kcal", true], ["mm", "근육량", "kg", true],
];
// 글로 나오는 결과
const INBODY_TEXT = [
  ["cid", "CID 유형", "예: 과체중 고도비만형(C자)"], ["shape", "체형좌표", "예: 비만"], ["balance", "상체하체 균형", "예: 균형"],
];
const F = Object.fromEntries(INBODY_FIELDS.map(([k, n, u]) => [k, { n, u }]));

function Form({ editing, daily, onDone }) {
  const [date, setDate] = useState(editing?.date || today());
  const [v, setV] = useState(editing?.values || {});
  const [note, setNote] = useState(editing?.values?.note || "");
  const [st, setSt] = useState(""), [bad, setBad] = useState([]), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const values = {}, wrong = [];
    for (const [k] of INBODY_FIELDS) {
      const s = String(v[k] ?? "").trim(); if (s === "") continue;
      const n = +s; if (isNaN(n) || n < 0) wrong.push(k); else values[k] = n;
    }
    INBODY_TEXT.forEach(([k]) => { const s = String(v[k] ?? "").trim(); if (s) values[k] = s; });
    if (note.trim()) values.note = note.trim();
    setBad(wrong);
    if (wrong.length) { setSt("빨간 칸을 확인해 주세요."); return; }
    if (!Object.keys(values).length) { setSt("값을 하나 이상 넣어 주세요."); return; }
    setBusy(true);
    try { await saveInbody({ id: editing?.id, date, values }, daily); setSt(`${fmtDate(date)} 인바디 결과를 저장했어요.`); setV({}); setNote(""); await onDone(); }
    catch (err) { setSt("저장하지 못했어요. " + (err.code === "23505" ? "그날 인바디 결과가 이미 있어요. 목록에서 수정을 눌러 주세요." : err.message)); }
    setBusy(false);
  }
  return <form onSubmit={submit} autoComplete="off">
    <div className="grid-in">
      <label>측정일<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
      {INBODY_FIELDS.map(([k, n, u]) => <Num key={k} label={n} unit={u} value={v[k] ?? ""} bad={bad.includes(k)} onChange={x => setV({ ...v, [k]: x })} />)}
    </div>
    <div className="grid-in">{INBODY_TEXT.map(([k, n, ph]) => <label key={k}>{n}<input value={v[k] ?? ""} placeholder={ph} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}</div>
    <label>메모<input value={note} onChange={e => setNote(e.target.value)} placeholder="예: 아침 공복, 화장실 다녀온 뒤" /></label>
    <div className="actions">
      <button className="btn" disabled={busy}>{editing ? "수정 저장" : "인바디 결과 저장"}</button>
      {editing && <button type="button" className="btn ghost" onClick={() => onDone()}>취소</button>}
      <span className="status">{st || "결과지에 있는 항목만 넣으면 돼요. 체중·골격근량·체지방률은 체중 그래프에도 같이 들어가요."}</span>
    </div>
  </form>;
}

export default function Inbody({ data, refresh }) {
  const list = [...(data.inbody || [])].sort((a, b) => a.date.localeCompare(b.date));
  const [metric, setMetric] = useState("smm");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const pts = list.filter(r => r.values?.[metric] != null).map(r => ({ d: r.date, v: r.values[metric] }));
  const used = INBODY_FIELDS.filter(([k]) => list.some(r => r.values?.[k] != null));

  return <>
    <div id="inbody-form"><Panel title={editing ? `${fmtDate(editing.date)} 인바디 수정` : "인바디 결과 넣기"}>
      <Form key={editing?.id || "new"} editing={editing} daily={data.daily} onDone={async () => { setEditing(null); await refresh(); }} />
    </Panel></div>

    <Panel title="인바디 변화" actions={used.length > 1 && <Seg value={metric} onChange={setMetric} options={used.map(([k, n]) => [k, n])} />}>
      <Chart labels series={[{ points: pts, color: "var(--accent)" }]} empty="인바디 결과를 넣으면 여기에 그래프가 그려져요." />
      {pts.length > 0 && <p className="note">{F[metric].n} ({F[metric].u || "단위 없음"})</p>}
    </Panel>

    <Panel title="인바디 기록" hint={`${list.length}회`}>
      {list.length ? <ul className="dose-list">{[...list].reverse().map((r, i, arr) => {
        const prev = arr[i + 1];
        return <li key={r.id}>
          <div className="dose-main">
            <b className="mono">{fmtDate(r.date)}</b>
            <div className="ib-grid">{INBODY_FIELDS.filter(([k]) => r.values?.[k] != null).map(([k, n, u, main]) => <div key={k} className={main ? "ib main" : "ib"}>
              <span className="card-label">{n}</span>
              <span className="mono">{r.values[k]}<small> {u}</small></span>
              {main && prev?.values?.[k] != null && <Delta c={change(r.values[k], prev.values[k])} />}
            </div>)}</div>
            {INBODY_TEXT.some(([k]) => r.values[k]) && <div className="card-sub">{INBODY_TEXT.filter(([k]) => r.values[k]).map(([k, n]) => `${n} ${r.values[k]}`).join(" · ")}</div>}
            {r.values.note && <div className="card-sub">{r.values.note}</div>}
          </div>
          <div className="dose-btns">
            <button className="btn ghost sm" onClick={() => { setEditing(r); setConfirm(null); document.getElementById("inbody-form").scrollIntoView({ behavior: "smooth" }); }}>수정</button>
            {confirm === r.id ? <button className="btn danger sm" onClick={async () => { await deleteVisit(r.id); setConfirm(null); refresh(); }}>정말 삭제</button>
              : <button className="btn danger sm" onClick={() => setConfirm(r.id)}>삭제</button>}
          </div>
        </li>;
      })}</ul> : <div className="chart-empty">인바디 기록이 아직 없어요.</div>}
    </Panel>
  </>;
}
