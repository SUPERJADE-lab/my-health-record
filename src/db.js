import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const DAILY_NUM = ["steps", "sbp", "dbp", "pulse", "weight", "lean", "smm", "fat", "water_ml"];
export const DAILY_FIELDS = [...DAILY_NUM, "note"];
export const INBODY = "인바디";

function check({ data, error }) { if (error) throw error; return data; }

// Supabase는 한 번에 1000줄까지만 주니까 나눠서 다 읽어요
async function all(table, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb.from(table).select("*").order(order).range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}
const numify = (r, keys) => { keys.forEach(k => { if (r[k] != null) r[k] = +r[k]; }); return r; };

export async function loadAll() {
  const [visits, daily, doses, prof] = await Promise.all([
    all("lab_visits", "date"), all("daily", "date"), all("doses", "date"),
    sb.from("profile").select("*").maybeSingle().then(check),
  ]);
  // 인바디 결과는 표를 새로 만들지 않고 lab_visits에 진료과 "인바디"로 저장해요
  return {
    visits: visits.filter(v => v.dept !== INBODY), inbody: visits.filter(v => v.dept === INBODY), doses: doses.map(d => numify(d, ["dose_mg", "appetite"])),
    daily: daily.map(d => numify(d, DAILY_NUM)),
    profile: prof ? numify(prof, ["start_weight", "target_weight"]) : {},
  };
}

const uid = async () => (await sb.auth.getUser()).data.user.id;
const stamp = r => ({ ...r, updated_at: new Date().toISOString() });

export async function saveVisit(v) {
  const row = stamp({ user_id: await uid(), date: v.date, dept: v.dept, values: v.values });
  if (v.id) return check(await sb.from("lab_visits").update(row).eq("id", v.id).select().single());
  return check(await sb.from("lab_visits").upsert(row, { onConflict: "user_id,date,dept" }).select().single());
}
// 인바디 결과를 저장하고, 체중·체성분 그래프가 같이 움직이도록 일상 기록에도 같은 날 값을 넣어요
export async function saveInbody(r, daily) {
  const saved = await saveVisit({ id: r.id, date: r.date, dept: INBODY, values: r.values });
  const prev = daily.find(d => d.date === r.date) || {};
  const pick = { weight: r.values.weight, smm: r.values.smm, fat: r.values.pbf };
  const row = { date: r.date };
  DAILY_FIELDS.forEach(k => { if (prev[k] != null) row[k] = prev[k]; });
  Object.entries(pick).forEach(([k, v]) => { if (v != null) row[k] = v; });
  await saveDaily(row);
  return saved;
}
export const deleteVisit = async id => check(await sb.from("lab_visits").delete().eq("id", id));

export async function saveDaily(row) {
  return numify(check(await sb.from("daily").upsert(stamp({ user_id: await uid(), ...row }), { onConflict: "user_id,date" }).select().single()), DAILY_NUM);
}
export async function saveDose(d) {
  const row = stamp({ user_id: await uid(), date: d.date, drug: d.drug || "마운자로", dose_mg: d.dose_mg, site: d.site || null,
    appetite: d.appetite || null, side_effects: d.side_effects || [], note: d.note || null });
  const q = d.id ? sb.from("doses").update(row).eq("id", d.id) : sb.from("doses").insert(row);
  return numify(check(await q.select().single()), ["dose_mg", "appetite"]);
}
export const deleteDose = async id => check(await sb.from("doses").delete().eq("id", id));
export async function saveProfile(p) {
  const { user_id, updated_at, ...rest } = p;
  return check(await sb.from("profile").upsert(stamp({ ...rest, user_id: await uid() })).select().single());
}

// 복용약 목록은 표를 새로 만들지 않으려고 profile.ref_overrides 안의 "_meds" 칸에 둬요
export const getMeds = profile => profile?.ref_overrides?._meds || [];
export async function saveMeds(profile, meds) {
  return saveProfile({ ...profile, ref_overrides: { ...(profile.ref_overrides || {}), _meds: meds } });
}

// 기존 기록장 백업(JSON)이나 이 앱 백업을 가져와요. 같은 날짜 기록은 덮어써요.
export async function importBackup(json, onProgress = () => {}) {
  const user_id = await uid();
  const visits = (json.visits || []).filter(v => v && v.date).map(v => stamp({ user_id, date: v.date, dept: v.dept || "확인 필요", values: v.values || {} }));
  const daily = (json.daily || []).filter(d => d && d.date).map(d => {
    const r = { user_id, date: d.date };
    DAILY_FIELDS.forEach(k => { if (d[k] != null && d[k] !== "") r[k] = d[k]; });
    return stamp(r);
  });
  // upsert는 줄마다 같은 칸을 가져야 해서 빈 칸은 null로 채워요
  const dkeys = [...new Set(daily.flatMap(Object.keys))];
  daily.forEach(r => dkeys.forEach(k => { if (!(k in r)) r[k] = null; }));
  const doses = (json.doses || []).filter(d => d && d.date && d.dose_mg != null);
  let done = 0; const total = visits.length + daily.length + doses.length;
  for (let i = 0; i < visits.length; i += 200) {
    check(await sb.from("lab_visits").upsert(visits.slice(i, i + 200), { onConflict: "user_id,date,dept" }));
    onProgress((done += visits.slice(i, i + 200).length), total);
  }
  for (let i = 0; i < daily.length; i += 500) {
    check(await sb.from("daily").upsert(daily.slice(i, i + 500), { onConflict: "user_id,date" }));
    onProgress((done += daily.slice(i, i + 500).length), total);
  }
  if (doses.length) {
    const existing = new Set((await all("doses", "date")).map(d => d.date + "|" + d.dose_mg));
    const fresh = doses.filter(d => !existing.has(d.date + "|" + d.dose_mg)).map(d => stamp({
      user_id, date: d.date, drug: d.drug || "마운자로", dose_mg: d.dose_mg, site: d.site || null,
      appetite: d.appetite || null, side_effects: d.side_effects || [], note: d.note || null }));
    if (fresh.length) check(await sb.from("doses").insert(fresh));
    onProgress((done += doses.length), total);
  }
  if (json.profile && Object.keys(json.profile).length) await saveProfile(json.profile);
  // 약 목록 파일: 같은 이름의 약은 새 내용으로 바꾸고 나머지는 그대로 둬요
  if (Array.isArray(json.meds) && json.meds.length) {
    const prof = check(await sb.from("profile").select("*").maybeSingle()) || {};
    const byName = new Map(getMeds(prof).map(m => [m.name, m]));
    json.meds.forEach(m => m && m.name && byName.set(m.name, { ...byName.get(m.name), ...m }));
    await saveMeds(prof, [...byName.values()]);
  }
  return { visits: visits.length, daily: daily.length, doses: doses.length, meds: (json.meds || []).length };
}
