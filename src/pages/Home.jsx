import { KIDNEY_KEYS, SHORT, flag, refText } from "../items.js";
import { fmtDate, today, addDays, daysBetween, avg, lastTwo, change } from "../util.js";
import { Panel, Value, Delta } from "../ui.jsx";
import Chart from "../Chart.jsx";

const dday = d => { const n = daysBetween(today(), d); return n === 0 ? "오늘" : n > 0 ? `D-${n}` : `${-n}일 지남`; };

export default function Home({ data, items, go }) {
  // 체중·투약은 다른 사람이 볼 수 있는 홈에는 보여주지 않아요
  const { visits, daily, profile } = data;
  const t = today();

  const labCards = KIDNEY_KEYS.slice(0, 4).map(k => {
    const [cur, prev] = lastTwo(visits, v => v.values?.[k]);
    return { k, it: items[k], cur, prev, c: cur && prev ? change(cur.values[k], prev.values[k]) : null };
  });

  const week = daily.filter(d => d.date > addDays(t, -7));
  const [bp, bpPrev] = lastTwo(daily, d => d.sbp);
  const bp30 = daily.filter(d => d.date > addDays(t, -30));
  const bpPts = k => bp30.filter(d => d[k] != null).map(d => ({ d: d.date, v: d[k] }));
  const bpWeek = week.filter(d => d.sbp != null);
  const steps7 = avg(week.filter(d => d.steps != null).map(d => d.steps));



  const latestVisit = [...visits].sort((a, b) => a.date.localeCompare(b.date)).filter(v => Object.keys(v.values || {}).length > 3).pop();
  const outs = latestVisit ? Object.entries(latestVisit.values).filter(([k, v]) => items[k] && flag(items[k], v)) : [];

  return <>
    <header className="page-head">
      <div className="eyebrow">{fmtDate(t)}</div>
      <h1>오늘의 건강 요약</h1>
      {profile.next_visit && <p className="lede">다음 병원 검사 <b>{fmtDate(profile.next_visit)}</b> · {dday(profile.next_visit)}</p>}
    </header>

    <Panel title="혈압 · 맥박" hint={bp ? `최근 측정 ${fmtDate(bp.date)}` : ""} actions={<button className="link" onClick={() => go("daily")}>기록하기 →</button>}>
      {bp ? <div className="bp-row">
        <div className="card">
          <div className="card-label">최근 혈압</div>
          <div className="card-num">{bp.sbp}/{bp.dbp ?? "-"} <small>mmHg</small></div>
          <span className="delta">{bpPrev ? `이전(${fmtDate(bpPrev.date).slice(5)}) ${bpPrev.sbp}/${bpPrev.dbp ?? "-"}` : "이전 기록 없음"}</span>
          <div className="card-sub">{bp.pulse != null ? `맥박 ${bp.pulse}회/분` : ""}</div>
        </div>
        <div className="card">
          <div className="card-label">최근 7일 평균</div>
          <div className="card-num">{bpWeek.length ? `${Math.round(avg(bpWeek.map(d => d.sbp)))}/${Math.round(avg(bpWeek.filter(d => d.dbp != null).map(d => d.dbp)))}` : "—"} <small>mmHg</small></div>
          <div className="card-sub">{bpWeek.length ? `${bpWeek.length}일 측정` : "최근 7일 기록 없음"}</div>
        </div>
      </div> : <div className="chart-empty">혈압 기록이 아직 없어요. 일상 탭에서 넣어 주세요.</div>}
      {bpPts("sbp").length > 0 && <>
        <Chart height={170} from={addDays(t, -30)} to={t} band={[60, 120]} series={[{ points: bpPts("sbp"), color: "var(--high)" }, { points: bpPts("dbp"), color: "var(--low)" }, { points: bpPts("pulse"), color: "var(--muted)" }]} />
        <p className="note"><span className="lg"><i style={{ background: "var(--high)" }} />수축기</span><span className="lg"><i style={{ background: "var(--low)" }} />이완기</span><span className="lg"><i style={{ background: "var(--muted)" }} />맥박</span> 최근 30일 · 옅은 띠는 일반 기준 60~120</p>
      </>}
    </Panel>

    <Panel title="신장 검사" hint="가장 최근 검사와 그 직전 검사 비교" actions={<button className="link" onClick={() => go("kidney")}>자세히 →</button>}>
      <div className="cards">
        {labCards.map(({ k, it, cur, c }) => <div className="card" key={k}>
          <div className="card-label">{SHORT[k]}</div>
          <div className="card-num">{cur ? <Value it={it} v={cur.values[k]} /> : "—"} <small>{it.u}</small></div>
          <Delta c={c} />
          <div className="card-sub">{cur ? fmtDate(cur.date) : "기록 없음"} · 참고치 {refText(it)}</div>
        </div>)}
      </div>
    </Panel>

    <div className="cards cards-lg">
      <div className="card panel-like">
        <div className="card-label">걸음 수</div>
        <div className="card-num">{steps7 != null ? Math.round(steps7).toLocaleString() : "—"} <small>걸음</small></div>
        <div className="card-sub">최근 7일 하루 평균</div>
      </div>
    </div>

    {latestVisit && <Panel title="최근 검사에서 참고범위를 벗어난 항목" hint={`${fmtDate(latestVisit.date)} ${latestVisit.dept}`}>
      {outs.length ? <ul className="out-list">{outs.map(([k, v]) => <li key={k}>
        <span>{items[k].n}</span><span><Value it={items[k]} v={v} /> <small className="muted">{items[k].u} · 참고치 {refText(items[k])}</small></span>
      </li>)}</ul> : <p className="note">이번 검사에서는 참고범위를 벗어난 항목이 없어요.</p>}
      <p className="note">참고범위를 벗어났다는 표시일 뿐, 건강 상태를 판단한 것은 아니에요. 수치의 의미는 담당 선생님과 상의해 주세요.</p>
    </Panel>}
  </>;
}
