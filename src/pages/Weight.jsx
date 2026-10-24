import { useState } from "react";
import { fmtDate, today, addDays, round } from "../util.js";
import { saveDose, deleteDose, saveProfile } from "../db.js";
import { Panel, Seg, Num } from "../ui.jsx";
import Chart from "../Chart.jsx";

const SITES = ["배", "허벅지", "팔"];
const EFFECTS = ["메스꺼움", "구토", "설사", "변비", "속쓰림", "복통", "피로", "어지러움", "주사 부위 반응"];
const APPETITE = ["", "거의 없음", "적음", "보통", "많음", "아주 많음"];

function Goals({ profile, refresh }) {
  const [p, setP] = useState({ start_weight: profile.start_weight ?? "", target_weight: profile.target_weight ?? "", start_date: profile.start_date ?? "" });
  const [st, setSt] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      await saveProfile({ ...profile, start_weight: p.start_weight === "" ? null : +p.start_weight, target_weight: p.target_weight === "" ? null : +p.target_weight, start_date: p.start_date || null });
      setSt("저장했어요."); refresh();
    } catch (err) { setSt("저장하지 못했어요. " + err.message); }
  }
  return <form onSubmit={submit} className="row">
    <Num label="시작 체중" unit="kg" value={p.start_weight} onChange={v => setP({ ...p, start_weight: v })} />
    <Num label="목표 체중" unit="kg" value={p.target_weight} onChange={v => setP({ ...p, target_weight: v })} />
    <label>시작한 날<input type="date" value={p.start_date} onChange={e => setP({ ...p, start_date: e.target.value })} /></label>
    <div className="actions"><button className="btn">목표 저장</button><span className="status">{st}</span></div>
  </form>;
}

function DoseForm({ last, editing, onDone }) {
  const blank = { date: today(), dose_mg: last?.dose_mg ?? 2.5, site: "", appetite: "", side_effects: [], note: "" };
  const [f, setF] = useState(editing || blank);
  const [st, setSt] = useState(""), [busy, setBusy] = useState(false);
  const toggle = e => setF(p => ({ ...p, side_effects: p.side_effects.includes(e) ? p.side_effects.filter(x => x !== e) : [...p.side_effects, e] }));
  async function submit(ev) {
    ev.preventDefault();
    if (!(+f.dose_mg > 0)) { setSt("용량을 확인해 주세요."); return; }
    setBusy(true);
    try { await saveDose({ ...f, dose_mg: +f.dose_mg, appetite: f.appetite ? +f.appetite : null }); setSt(`${fmtDate(f.date)} 투약을 저장했어요.`); setF(blank); await onDone(); }
    catch (err) { setSt("저장하지 못했어요. " + err.message); }
    setBusy(false);
  }
  return <form onSubmit={submit} autoComplete="off">
    <div className="grid-in">
      <label>투약일<input type="date" required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
      <Num label="용량" unit="mg" value={f.dose_mg} onChange={v => setF({ ...f, dose_mg: v })} />
      <label>주사 부위<select value={f.site || ""} onChange={e => setF({ ...f, site: e.target.value })}><option value="">선택 안 함</option>{SITES.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>식욕 (1~5)<select value={f.appetite || ""} onChange={e => setF({ ...f, appetite: e.target.value })}>{APPETITE.map((a, i) => <option key={i} value={i || ""}>{i ? `${i} · ${a}` : "선택 안 함"}</option>)}</select></label>
    </div>
    <fieldset><legend>불편한 증상</legend><div className="chips">
      {EFFECTS.map(e => <button type="button" key={e} className={"chip" + (f.side_effects.includes(e) ? " on" : "")} onClick={() => toggle(e)}>{e}</button>)}
    </div></fieldset>
    <label>메모<input type="text" value={f.note || ""} onChange={e => setF({ ...f, note: e.target.value })} placeholder="예: 저녁에 메스꺼움, 물 1.5L 마심" /></label>
    <div className="actions">
      <button className="btn" disabled={busy}>{editing ? "수정 저장" : "투약 기록 저장"}</button>
      {editing && <button className="btn ghost" type="button" onClick={() => onDone()}>취소</button>}
      <span className="status">{st}</span>
    </div>
    <p className="note">심한 구토나 설사가 계속되면 탈수로 신장에 부담이 갈 수 있어요. 그런 날은 증상을 꼭 체크해 두고 담당 선생님께 알려주세요.</p>
  </form>;
}

export default function Weight({ data, refresh }) {
  const { daily, doses, profile } = data;
  const [range, setRange] = useState(180);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const from = range ? addDays(today(), -range) : "0000";
  const rows = daily.filter(d => d.date >= from);
  const pts = k => rows.filter(d => d[k] != null).map(d => ({ d: d.date, v: d[k] }));
  const last = doses[doses.length - 1];
  const lastW = [...daily].reverse().find(d => d.weight != null);

  return <>
    <header className="page-head"><div className="eyebrow">WEIGHT</div><h1>체중 · 마운자로</h1>
      {lastW && profile.target_weight && <p className="lede">현재 <b>{lastW.weight}kg</b> · 목표 {profile.target_weight}kg까지 <b>{round(lastW.weight - profile.target_weight)}kg</b> 남았어요.</p>}
    </header>

    <Panel title="목표"><Goals profile={profile} refresh={refresh} /></Panel>

    <Panel title="체중 변화" actions={<Seg value={range} onChange={setRange} options={[[30, "30일"], [90, "90일"], [180, "6개월"], [365, "1년"], [0, "전체"]]} />}>
      <Chart series={[{ points: pts("weight"), color: "var(--accent)" }]} markers={doses.map(d => d.date)} from={range ? from : undefined} to={today()}
        target={profile.target_weight ? { v: profile.target_weight, label: `목표 ${profile.target_weight}kg` } : null} />
      <p className="note"><span className="lg"><i style={{ background: "var(--violet)" }} />아래 보라색 눈금은 투약한 날, 점선은 목표 체중이에요.</span></p>
    </Panel>

    <Panel title="체성분" hint="인바디 측정일 기록">
      <Chart series={[{ points: pts("lean"), color: "var(--accent)" }, { points: pts("smm"), color: "var(--low)" }, { points: pts("fat"), color: "var(--high)" }]} />
      <p className="note"><span className="lg"><i style={{ background: "var(--accent)" }} />제지방량(kg)</span><span className="lg"><i style={{ background: "var(--low)" }} />골격근량(kg)</span><span className="lg"><i style={{ background: "var(--high)" }} />체지방률(%)</span></p>
    </Panel>

    <div id="dose-form"><Panel title={editing ? `${fmtDate(editing.date)} 투약 수정` : "투약 기록하기"} hint={last ? `마지막 투약 ${fmtDate(last.date)} · 다음 예정 ${fmtDate(addDays(last.date, 7))}` : ""}>
      <DoseForm key={editing?.id || "new"} last={last} editing={editing} onDone={async () => { setEditing(null); await refresh(); }} />
    </Panel></div>

    <Panel title="투약 기록" hint={`${doses.length}회`}>
      {doses.length ? <div className="tbl-wrap"><table>
        <thead><tr><th>투약일</th><th className="num">용량</th><th>부위</th><th>식욕</th><th>증상</th><th>메모</th><th></th></tr></thead>
        <tbody>{[...doses].reverse().map(d => <tr key={d.id}>
          <td className="mono">{fmtDate(d.date)}</td><td className="v">{d.dose_mg}mg</td><td>{d.site || ""}</td>
          <td>{d.appetite ? `${d.appetite} · ${APPETITE[d.appetite]}` : ""}</td>
          <td className="wrap-cell">{(d.side_effects || []).join(", ")}</td><td className="wrap-cell">{d.note || ""}</td>
          <td className="actions-cell">
            <button className="link" onClick={() => { setEditing(d); document.getElementById("dose-form").scrollIntoView({ behavior: "smooth" }); }}>수정</button>
            {confirm === d.id ? <button className="link danger" onClick={async () => { await deleteDose(d.id); setConfirm(null); refresh(); }}>정말 삭제</button>
              : <button className="link danger" onClick={() => setConfirm(d.id)}>삭제</button>}
          </td>
        </tr>)}</tbody>
      </table></div> : <div className="chart-empty">투약 기록이 아직 없어요.</div>}
    </Panel>
  </>;
}
