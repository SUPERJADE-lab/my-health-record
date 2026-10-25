import { useState } from "react";
import { BASE_ITEMS, GROUPS, refText } from "../items.js";
import { sb, importBackup, saveProfile } from "../db.js";
import { today, download, toCsv, fmtDate } from "../util.js";
import { Panel, Num } from "../ui.jsx";

function Backup({ data }) {
  const d = today();
  const json = () => download(`health-backup-${d}.json`, JSON.stringify({
    exportedAt: new Date().toISOString(), app: "my-health-record",
    visits: [...data.visits, ...data.inbody].map(({ date, dept, values }) => ({ date, dept, values })),
    daily: data.daily.map(({ user_id, updated_at, ...r }) => Object.fromEntries(Object.entries(r).filter(([, v]) => v != null))),
    doses: data.doses.map(({ id, user_id, updated_at, ...r }) => r),
    profile: (({ user_id, updated_at, ...r }) => r)(data.profile || {}),
  }, null, 1), "application/json");
  const labCsv = () => {
    const keys = Object.keys(BASE_ITEMS).filter(k => data.visits.some(v => v.values?.[k] != null));
    download(`lab-results-${d}.csv`, toCsv(data.visits, [["date", "검사일"], ["dept", "진료과"], ...keys.map(k => [r => r.values?.[k], BASE_ITEMS[k].n])]), "text/csv");
  };
  const dailyCsv = () => download(`daily-${d}.csv`, toCsv(data.daily, [["date", "날짜"], ["steps", "걸음 수"], ["sbp", "수축기"], ["dbp", "이완기"], ["pulse", "맥박"],
    ["weight", "체중(kg)"], ["lean", "제지방량(kg)"], ["smm", "골격근량(kg)"], ["fat", "체지방률(%)"], ["water_ml", "물(mL)"], ["note", "메모"]]), "text/csv");
  const doseCsv = () => download(`doses-${d}.csv`, toCsv(data.doses, [["date", "투약일"], ["drug", "약"], ["dose_mg", "용량(mg)"], ["site", "부위"], ["appetite", "식욕(1~5)"],
    [r => (r.side_effects || []).join(" / "), "증상"], ["note", "메모"]]), "text/csv");
  return <>
    <p className="note">한 달에 한 번쯤 JSON 백업을 받아 맥북에 저장해 두세요. 이 파일 하나로 모든 기록을 되살릴 수 있어요. CSV는 엑셀·넘버스에서 열어보는 용도예요.</p>
    <div className="actions">
      <button className="btn" onClick={json}>전체 백업 받기 (JSON)</button>
      <button className="btn ghost" onClick={labCsv}>검사 기록 CSV</button>
      <button className="btn ghost" onClick={dailyCsv}>일상 기록 CSV</button>
      <button className="btn ghost" onClick={doseCsv}>투약 기록 CSV</button>
    </div>
  </>;
}

function Import({ refresh }) {
  const [st, setSt] = useState(""), [busy, setBusy] = useState(false);
  async function onFile(e) {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    let json;
    try { json = JSON.parse(await file.text()); } catch { setSt("JSON 파일을 읽지 못했어요. 백업 파일이 맞는지 확인해 주세요."); return; }
    if (!Array.isArray(json.visits) && !Array.isArray(json.daily) && !Array.isArray(json.meds)) { setSt("이 파일에는 가져올 기록이 없어요."); return; }
    setBusy(true);
    try {
      const r = await importBackup(json, (n, t) => setSt(`옮기는 중… ${n} / ${t}`));
      await refresh();
      setSt(`다 옮겼어요. ${[r.visits && `검사·인바디 ${r.visits}회`, r.daily && `일상 기록 ${r.daily}일`, r.doses && `투약 ${r.doses}회`, r.meds && `복용약 ${r.meds}가지`].filter(Boolean).join(", ")}.`);
    } catch (err) { setSt("옮기다가 멈췄어요. 다시 가져오면 이어서 덮어써요. (" + err.message + ")"); }
    setBusy(false);
  }
  return <>
    <p className="note">기존 기록장 백업(health-backup-2026-10-24.json)이나 이 앱에서 받은 백업을 고르세요. 같은 날짜 기록은 파일 내용으로 덮어써서, 여러 번 가져와도 겹치지 않아요.</p>
    <label className="btn ghost file-btn">{busy ? "옮기는 중…" : "백업 파일 가져오기"}<input type="file" accept=".json,application/json" onChange={onFile} disabled={busy} hidden /></label>
    {st && <p className="status">{st}</p>}
  </>;
}

function Refs({ profile, refresh }) {
  const ov = profile.ref_overrides || {};
  const numeric = GROUPS.flatMap(g => g.items).filter(it => !it.text);
  const [k, setK] = useState("upcr");
  const cur = ov[k] || {};
  const [lo, setLo] = useState(cur.lo ?? ""), [hi, setHi] = useState(cur.hi ?? "");
  const [st, setSt] = useState("");
  const pick = nk => { setK(nk); setLo(ov[nk]?.lo ?? ""); setHi(ov[nk]?.hi ?? ""); setSt(""); };
  async function save(reset) {
    const next = { ...ov };
    if (reset) delete next[k]; else next[k] = { lo: lo === "" ? null : +lo, hi: hi === "" ? null : +hi };
    try { await saveProfile({ ...profile, ref_overrides: next }); setSt(reset ? "결과지 기준으로 되돌렸어요." : "저장했어요."); if (reset) { setLo(""); setHi(""); } refresh(); }
    catch (err) { setSt("저장하지 못했어요. " + err.message); }
  }
  return <>
    <p className="note">결과지 참고치가 바뀌었거나, 담당 선생님이 따로 알려주신 기준이 있을 때만 바꾸세요. 바꾼 항목은 검사 표에 ‘직접 입력’으로 표시돼요.</p>
    <div className="row">
      <label>항목<select value={k} onChange={e => pick(e.target.value)}>{numeric.map(it => <option key={it.k} value={it.k}>{it.n}{ov[it.k] ? " (직접 입력)" : ""}</option>)}</select></label>
      <Num label="아래 기준" unit={BASE_ITEMS[k].u} value={lo} onChange={setLo} />
      <Num label="위 기준" unit={BASE_ITEMS[k].u} value={hi} onChange={setHi} />
    </div>
    <p className="note">결과지 기준: {refText(BASE_ITEMS[k])}</p>
    <div className="actions"><button className="btn" onClick={() => save(false)}>참고치 저장</button>
      {ov[k] && <button className="btn ghost" onClick={() => save(true)}>결과지 기준으로 되돌리기</button>}<span className="status">{st}</span></div>
  </>;
}

function NextVisit({ profile, refresh }) {
  const [d, setD] = useState(profile.next_visit || ""), [st, setSt] = useState("");
  async function save(e) { e.preventDefault(); try { await saveProfile({ ...profile, next_visit: d || null }); setSt("저장했어요."); refresh(); } catch (err) { setSt(err.message); } }
  return <form className="row" onSubmit={save}>
    <label>다음 검사일<input type="date" value={d} onChange={e => setD(e.target.value)} /></label>
    <div className="actions"><button className="btn">저장</button><span className="status">{st}</span></div>
  </form>;
}

export default function Settings({ data, refresh, session }) {
  return <>
    <header className="page-head"><div className="eyebrow">SETTINGS</div><h1>설정</h1>
      <p className="lede">{session.user.email}로 로그인했어요. 검사 {data.visits.length}회 · 일상 기록 {data.daily.length}일 · 투약 {data.doses.length}회
        {data.daily.length > 0 && ` (${fmtDate(data.daily[0].date)} ~ ${fmtDate(data.daily[data.daily.length - 1].date)})`}</p></header>
    <Panel title="다음 병원 검사"><NextVisit profile={data.profile} refresh={refresh} /></Panel>
    <Panel title="백업 받기"><Backup data={data} /></Panel>
    <Panel title="백업 파일 가져오기"><Import refresh={refresh} /></Panel>
    <Panel title="참고치 고치기"><Refs profile={data.profile} refresh={refresh} /></Panel>
    <Panel title="로그아웃"><div className="actions"><button className="btn danger" onClick={() => sb.auth.signOut()}>로그아웃</button></div></Panel>
  </>;
}
