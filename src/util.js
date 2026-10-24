export const fmtDate = d => (d ? d.replaceAll("-", ".") : "");
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
export const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const round = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;
export const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

// 최근 값과 그 직전 값
export function lastTwo(rows, get) {
  const r = rows.filter(x => get(x) != null && get(x) !== "");
  return [r[r.length - 1] || null, r[r.length - 2] || null];
}
export function change(cur, prev) {
  if (cur == null || prev == null || isNaN(cur) || isNaN(prev)) return null;
  const d = +cur - +prev;
  return { d: round(d, 2), pct: +prev ? round((d / +prev) * 100, 1) : null };
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function toCsv(rows, cols) {
  const q = v => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
  return "﻿" + [cols.map(c => q(c[1])).join(","), ...rows.map(r => cols.map(c => q(typeof c[0] === "function" ? c[0](r) : r[c[0]])).join(","))].join("\n");
}
