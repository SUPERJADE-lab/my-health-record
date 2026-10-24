// key, name, unit, lo, hi (서울아산병원 결과지 참조범위). 문자 결과 항목은 text: true, ok = 정상으로 볼 값.
export const GROUPS = [
  { name: "일반혈액검사", items: [
    { k: "wbc", n: "백혈구수(WBC)", u: "x10³/uL", lo: 4, hi: 10 },
    { k: "hb", n: "혈색소(Hb)", u: "g/dl", lo: 12, hi: 16 },
    { k: "plt", n: "혈소판수(PLT)", u: "x10³/uL", lo: 150, hi: 350 },
    { k: "anc", n: "기기절대호중구수(E-ANC)", u: "/uL" }]},
  { name: "요검사", items: [
    { k: "ualb", n: "알부민,소변(Albumin,Urine)", u: "", text: true, rt: "~ TR", ok: ["-", "TR", "±"] },
    { k: "uglu", n: "요당(Glucose,Urine)", u: "", text: true, rt: "-", ok: ["-"] },
    { k: "uob", n: "잠혈,소변(OB,Urine)", u: "", text: true, rt: "-", ok: ["-"] },
    { k: "urbc", n: "적혈구수,소변(RBC,Urine)", u: "/HPF", text: true, rt: "0 ~ 2", ok: ["0-2", "0", "1", "2"] },
    { k: "uwbc", n: "백혈구수,소변(WBC,Urine)", u: "/HPF", text: true, rt: "0 ~ 2", ok: ["0-2", "0", "1", "2"] }]},
  { name: "일반화학검사", items: [
    { k: "ca", n: "칼슘(Ca)", u: "mg/dL", lo: 8.6, hi: 10.2 },
    { k: "p", n: "인(P)", u: "mg/dL", lo: 2.5, hi: 4.5 },
    { k: "na", n: "소디움(Na)", u: "mmol/L", lo: 135, hi: 145 },
    { k: "k", n: "포타슘(K)", u: "mmol/L", lo: 3.5, hi: 5.1 },
    { k: "alb", n: "알부민(Albumin)", u: "g/dL", lo: 3.5, hi: 5.2 },
    { k: "glu", n: "혈당(Glucose)", u: "mg/dL", lo: 70, hi: 99 },
    { k: "tp", n: "총단백질(Total protein)", u: "g/dL", lo: 6, hi: 8 },
    { k: "ast", n: "아스파라긴산분해효소(AST(SGOT))", u: "IU/L", hi: 40 },
    { k: "alt", n: "알라닌트란스아미나제(ALT(SGPT))", u: "IU/L", hi: 40 },
    { k: "ldh", n: "유산탈수효소(LDH)", u: "IU/L", lo: 120, hi: 250 },
    { k: "cr", n: "크레아티닌(Creatinine)", u: "mg/dL", lo: 0.7, hi: 1.4 },
    { k: "ua", n: "요산(Uric acid)", u: "mg/dL", lo: 3, hi: 7 },
    { k: "tbil", n: "총빌리루빈(Total bilirubin)", u: "mg/dL", lo: 0.2, hi: 1.2 },
    { k: "bun", n: "혈중요소질소(BUN)", u: "mg/dL", lo: 10, hi: 26 },
    { k: "egfr", n: "추정사구체여과율(eGFR(CKD-EPI))", u: "mL/min/1.73m2", lo: 60 }]},
  { name: "지질검사", items: [
    { k: "tc", n: "총콜레스테롤(Total cholesterol)", u: "mg/dL", hi: 199 },
    { k: "tg", n: "중성지방(TG)", u: "mg/dL", hi: 199 },
    { k: "hdl", n: "고밀도콜레스테롤(HDL-cholesterol)", u: "mg/dL", lo: 40 },
    { k: "ldl", n: "저밀도콜레스테롤(LDL-cholesterol)", u: "mg/dL", hi: 129 }]},
  { name: "심근효소검사", items: [
    { k: "ck", n: "크레아티닌키나제(CK)", u: "IU/L", lo: 50, hi: 250 },
    { k: "mb", n: "마이오글로빈(Myoglobin)", u: "ng/mL", hi: 110 }]},
  { name: "당뇨검사", items: [
    { k: "a1c", n: "당화혈색소(HbA1c)", u: "%", lo: 4, hi: 6 }]},
  { name: "종양표지자", items: [
    { k: "ca125", n: "암항원 125(CA 125)", u: "U/mL", lo: 0, hi: 35 }]},
  { name: "요단백 검사", items: [
    { k: "upcr", n: "단백질/크레아티닌 비율,소변(Pro/Cr ratio,Urine)", u: "mg/g" }]},
];

export const BASE_ITEMS = {};
GROUPS.forEach(g => g.items.forEach(it => { BASE_ITEMS[it.k] = { lo: null, hi: null, ...it, g: g.name }; }));

// 신장 관리 화면과 대시보드에 올리는 항목
export const KIDNEY_KEYS = ["egfr", "cr", "upcr", "k", "bun"];
export const SHORT = { egfr: "eGFR", cr: "크레아티닌", upcr: "요단백/크레아티닌", k: "칼륨", bun: "BUN", ualb: "소변 알부민" };

// 참고치 고치기(설정)에서 바꾼 값을 덮어씀
export function withOverrides(ov = {}) {
  const out = {};
  for (const [k, it] of Object.entries(BASE_ITEMS)) {
    const o = ov[k];
    out[k] = o ? { ...it, lo: o.lo ?? null, hi: o.hi ?? null, custom: true } : it;
  }
  return out;
}

const norm = s => String(s).replace(/\s|\/HPF/gi, "").toUpperCase();
export function flag(it, v) {
  if (v == null || v === "") return "";
  if (it.text) return it.ok.map(norm).includes(norm(v)) ? "" : "high";
  if (isNaN(v)) return "";
  if (it.hi != null && +v > it.hi) return "high";
  if (it.lo != null && +v < it.lo) return "low";
  return "";
}
export function refText(it) {
  if (it.text) return it.rt;
  if (it.lo == null && it.hi == null) return "없음";
  if (it.lo == null) return "~ " + it.hi;
  if (it.hi == null) return it.lo + " ~";
  return it.lo + " ~ " + it.hi;
}
