import { useEffect, useMemo, useState, useCallback } from "react";
import { sb, configured, loadAll } from "./db.js";
import { withOverrides } from "./items.js";
import Home from "./pages/Home.jsx";
import Lab from "./pages/Lab.jsx";
import Kidney from "./pages/Kidney.jsx";
import Weight from "./pages/Weight.jsx";
import Daily from "./pages/Daily.jsx";
import Settings from "./pages/Settings.jsx";

const TABS = [
  ["home", "홈", "⌂"], ["lab", "검사", "✚"], ["kidney", "신장", "◐"],
  ["weight", "체중·투약", "◆"], ["daily", "일상", "♥"], ["settings", "설정", "⚙"],
];
const PAGES = { home: Home, lab: Lab, kidney: Kidney, weight: Weight, daily: Daily, settings: Settings };

function useHashTab() {
  const read = () => { const t = location.hash.slice(1); return PAGES[t] ? t : "home"; };
  const [tab, setTab] = useState(read);
  useEffect(() => { const f = () => setTab(read()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return [tab, t => { location.hash = t; window.scrollTo(0, 0); }];
}

function Login() {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setMsg(error.message.includes("Invalid") ? "이메일이나 비밀번호가 맞지 않아요." : "로그인하지 못했어요: " + error.message);
  }
  return <div className="center">
    <form className="panel login" onSubmit={submit}>
      <div className="eyebrow">MY HEALTH RECORD</div>
      <h1>나의 건강 기록장</h1>
      <label>이메일<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>비밀번호<input type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required /></label>
      <button className="btn" disabled={busy}>{busy ? "확인하는 중…" : "로그인"}</button>
      {msg && <p className="status err">{msg}</p>}
    </form>
  </div>;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, go] = useHashTab();

  useEffect(() => {
    if (!configured) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    try { setData(await loadAll()); setErr(""); }
    catch (e) { setErr("기록을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요. (" + (e.message || e) + ")"); }
  }, []);
  useEffect(() => { if (session) refresh(); else setData(null); }, [session?.user?.id]);

  const items = useMemo(() => withOverrides(data?.profile?.ref_overrides), [data?.profile?.ref_overrides]);

  if (!configured) return <div className="center"><div className="panel login"><h1>연결 설정이 필요해요</h1><p className="note">src/config.js에 Supabase 주소와 공개 키를 넣어야 해요.</p></div></div>;
  if (session === undefined) return <div className="center muted">여는 중…</div>;
  if (!session) return <Login />;

  const Page = PAGES[tab];
  return <div className="app">
    <nav className="tabs">
      <div className="brand">나의 건강 기록장</div>
      {TABS.map(([k, label, ic]) => <a key={k} href={"#" + k} className={k === tab ? "on" : ""} onClick={e => { e.preventDefault(); go(k); }}>
        <span className="ic" aria-hidden="true">{ic}</span><span>{label}</span></a>)}
    </nav>
    <main className="wrap">
      {err && <div className="panel err">{err}</div>}
      {!data ? <div className="muted center-pad">기록을 불러오는 중이에요…</div>
        : <Page data={data} items={items} refresh={refresh} go={go} session={session} />}
    </main>
  </div>;
}
