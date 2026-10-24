import { KIDNEY_KEYS, SHORT, refText } from "../items.js";
import { fmtDate, addDays, avg, round, lastTwo, change } from "../util.js";
import { Panel, Value, Delta } from "../ui.jsx";
import { ItemChart, itemHistory } from "./Lab.jsx";

export default function Kidney({ data, items }) {
  const { visits, daily } = data;
  const kv = visits.filter(v => KIDNEY_KEYS.some(k => v.values?.[k] != null)).sort((a, b) => b.date.localeCompare(a.date));

  // 검사일 전 7일 혈압 평균과 가장 가까운 체중
  const near = v => {
    const win = daily.filter(d => d.date <= v.date && d.date > addDays(v.date, -7));
    const s = win.filter(d => d.sbp != null), dd = win.filter(d => d.dbp != null);
    const w = daily.filter(d => d.weight != null && d.date <= v.date && d.date > addDays(v.date, -30)).pop();
    return { bp: s.length ? `${Math.round(avg(s.map(d => d.sbp)))}/${dd.length ? Math.round(avg(dd.map(d => d.dbp))) : "-"}` : null, wt: w?.weight };
  };

  return <>
    <header className="page-head"><div className="eyebrow">KIDNEY</div><h1>신장 관리</h1>
      <p className="lede">eGFR, 크레아티닌, 요단백, 칼륨, BUN을 모아 보고, 검사일 즈음의 혈압·체중과 나란히 비교해요.</p>
      <div className="actions no-print"><button className="btn ghost" onClick={() => print()}>진료용으로 인쇄 · PDF 저장</button></div>
    </header>

    <Panel title="검사일별 비교" hint="혈압은 검사일 전 7일 평균, 체중은 검사일 직전 기록">
      <div className="tbl-wrap"><table>
        <thead><tr><th>검사일</th>{KIDNEY_KEYS.map(k => <th key={k} className="num">{SHORT[k]}<small className="muted"> {items[k].u}</small></th>)}<th className="num">소변 알부민</th><th className="num">혈압</th><th className="num">체중</th></tr></thead>
        <tbody>{kv.map(v => { const n = near(v); return <tr key={v.id}>
          <td className="mono">{fmtDate(v.date)}</td>
          {KIDNEY_KEYS.map(k => <td key={k} className="v"><Value it={items[k]} v={v.values[k]} /></td>)}
          <td className="v"><Value it={items.ualb} v={v.values.ualb} /></td>
          <td className="v">{n.bp ?? <span className="muted">·</span>}</td>
          <td className="v">{n.wt ?? <span className="muted">·</span>}</td>
        </tr>; })}</tbody>
      </table></div>
    </Panel>

    <div className="grid2">
      {KIDNEY_KEYS.map(k => {
        const it = items[k], h = itemHistory(visits, k);
        const [cur, prev] = lastTwo(h, v => v.values[k]);
        return <Panel key={k} title={SHORT[k]} hint={`참고치 ${refText(it)} ${it.u}`}>
          <div className="mini-head">{cur ? <>최근 <b><Value it={it} v={cur.values[k]} /></b> ({fmtDate(cur.date)}) · <Delta c={cur && prev ? change(cur.values[k], prev.values[k]) : null} /></> : "기록 없음"}</div>
          <ItemChart visits={visits} it={it} height={220} />
          {k === "upcr" && it.lo == null && it.hi == null && <p className="note">요단백/크레아티닌 비율은 결과지에 참고치가 없어서 비워 뒀어요. 담당 선생님이 알려주신 기준이 있으면 설정 → 참고치 고치기에서 넣을 수 있어요.</p>}
        </Panel>;
      })}
      <Panel title="소변 알부민" hint={`참고치 ${refText(items.ualb)}`}><ItemChart visits={visits} it={items.ualb} /></Panel>
    </div>
    <p className="note">이 화면은 기록을 정리해 보여줄 뿐이에요. 변화의 의미는 담당 선생님과 상의해 주세요.</p>
  </>;
}
