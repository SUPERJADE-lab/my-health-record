import { useState } from "react";
import { getMeds, saveMeds } from "../db.js";
import { fmtDate, today, addDays, daysBetween } from "../util.js";
import { Panel } from "../ui.jsx";

const TIMES = ["아침 식전", "아침 식후", "점심 식후", "저녁 식후", "자기 전"];
const blank = { name: "", strength: "", per_dose: "1정", times: [], purpose: "", caution: "", dept: "신장내과", start: "", days: "" };
const endOf = m => (m.start && m.days ? addDays(m.start, +m.days - 1) : null);

function MedForm({ med, onSave, onCancel }) {
  const [f, setF] = useState({ ...blank, ...med });
  const toggle = t => setF(p => ({ ...p, times: p.times.includes(t) ? p.times.filter(x => x !== t) : TIMES.filter(x => [...p.times, t].includes(x)) }));
  return <form onSubmit={e => { e.preventDefault(); onSave({ ...f, days: f.days === "" ? null : +f.days }); }} autoComplete="off">
    <div className="grid-in">
      <label>약 이름<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="예: 아타칸 정" /></label>
      <label>함량<input value={f.strength} onChange={e => setF({ ...f, strength: e.target.value })} placeholder="예: 16mg" /></label>
      <label>1회 먹는 양<input value={f.per_dose} onChange={e => setF({ ...f, per_dose: e.target.value })} /></label>
      <label>처방일<input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label>
      <label>처방 일수<input type="number" min="1" inputMode="numeric" value={f.days ?? ""} onChange={e => setF({ ...f, days: e.target.value })} /></label>
      <label>진료과<input value={f.dept} onChange={e => setF({ ...f, dept: e.target.value })} /></label>
    </div>
    <fieldset><legend>먹는 때</legend><div className="chips">
      {TIMES.map(t => <button type="button" key={t} className={"chip" + (f.times.includes(t) ? " on-acc" : "")} onClick={() => toggle(t)}>{t}</button>)}
    </div></fieldset>
    <label>어떤 약인지<input value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} placeholder="예: 고혈압" /></label>
    <label>주의할 점<input value={f.caution} onChange={e => setF({ ...f, caution: e.target.value })} placeholder="예: 쪼개거나 씹지 말 것" /></label>
    <div className="actions"><button className="btn">저장</button><button type="button" className="btn ghost" onClick={onCancel}>취소</button></div>
  </form>;
}

export default function Meds({ data, refresh }) {
  const meds = getMeds(data.profile);
  const [edit, setEdit] = useState(null);       // null | "new" | 순번
  const [confirm, setConfirm] = useState(null);
  const [st, setSt] = useState("");
  const t = today();

  async function store(next, msg) {
    try { await saveMeds(data.profile, next); setSt(msg); setEdit(null); setConfirm(null); await refresh(); }
    catch (err) { setSt("저장하지 못했어요. " + err.message); }
  }
  const schedule = TIMES.map(time => [time, meds.filter(m => (m.times || []).includes(time))]).filter(([, l]) => l.length);
  const ends = meds.map(endOf).filter(Boolean).sort();

  return <Panel title="복용약" hint={ends.length ? `약이 떨어지는 날 ${fmtDate(ends[0])} · ${daysBetween(t, ends[0]) >= 0 ? `${daysBetween(t, ends[0])}일 남음` : "지남"}` : ""}
    actions={edit === null && <button className="link no-print" onClick={() => setEdit("new")}>+ 약 추가</button>}>
    {schedule.length > 0 && <div className="med-schedule">{schedule.map(([time, l]) => <div key={time}>
      <span className="med-time">{time}</span><span>{l.map(m => m.name.replace(/\s*정$/, "")).join(", ")} <small className="muted">({l.length}알)</small></span>
    </div>)}</div>}
    {edit === "new" && <MedForm onCancel={() => setEdit(null)} onSave={m => store([...meds, m], `${m.name}을(를) 추가했어요.`)} />}
    {meds.length ? <ul className="dose-list">{meds.map((m, i) => edit === i
      ? <li key={i}><MedForm med={m} onCancel={() => setEdit(null)} onSave={n => store(meds.map((x, j) => j === i ? n : x), "고쳤어요.")} /></li>
      : <li key={i}>
        <div className="dose-main">
          <b>{m.name} {m.strength && <span className="mono">{m.strength}</span>}</b>
          <div className="card-sub">{[m.per_dose, (m.times || []).join(" · "), m.purpose].filter(Boolean).join(" · ")}</div>
          {m.caution && <div className="card-sub warn">⚠ {m.caution}</div>}
          {m.start && <div className="card-sub">{m.dept} {fmtDate(m.start)} 처방{m.days ? ` · ${m.days}일분 · ${fmtDate(endOf(m))}까지` : ""}</div>}
        </div>
        <div className="dose-btns no-print">
          <button className="btn ghost sm" onClick={() => { setEdit(i); setConfirm(null); }}>수정</button>
          {confirm === i ? <button className="btn danger sm" onClick={() => store(meds.filter((_, j) => j !== i), "지웠어요.")}>정말 삭제</button>
            : <button className="btn danger sm" onClick={() => setConfirm(i)}>삭제</button>}
        </div>
      </li>)}</ul> : edit !== "new" && <div className="chart-empty">복용약이 아직 없어요. 설정에서 약 목록 파일을 가져오거나 ‘+ 약 추가’를 눌러 넣어 주세요.</div>}
    {st && <p className="status">{st}</p>}
    <p className="note">약을 바꾸거나 끊는 것은 꼭 담당 선생님과 상의해 주세요.</p>
  </Panel>;
}
