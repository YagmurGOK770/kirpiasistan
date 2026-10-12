// Updates data/enflasyon.json (read by the Kirpi app's Ana Sayfa) from TCMB EVDS.
// TÜİK publishes TÜFE on the 3rd of each month at 10:00 (next working day if needed) for the
// previous month. We fetch the TÜFE index and compute — exactly as TÜİK defines them —
//   monthly = I(t)/I(t-1) - 1, annual = I(t)/I(t-12) - 1,
//   12-month average (the legal rent-increase cap) = avg(I(t-11..t)) / avg(I(t-23..t-12)) - 1.
// The index changed base in 2026 (2003=100 → 2025=100); the old series is chained onto the new.
// Safety: nothing is written unless the numbers pass sanity checks; an already-published month
// is never changed. Usage: EVDS_KEY=… node scripts/enflasyon.mjs [discover]
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.EVDS_KEY;
const BASE = 'https://evds3.tcmb.gov.tr/igmevdsms-dis/';
const FILE = new URL('../data/enflasyon.json', import.meta.url);
// Series codes (overridable from the workflow without a code change).
const NEW_CODE = process.env.TUFE_SERIES || 'TP.TUKFIY2025.GENEL'; // TÜFE (2025=100)
const OLD_CODE = process.env.TUFE_OLD_SERIES || 'TP.GENENDEKS.T1'; // TÜFE (2003=100), archived

if (!KEY) {
  console.error('EVDS_KEY is not set');
  process.exit(1);
}

async function get(path) {
  const res = await fetch(BASE + path, { headers: { key: KEY, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}\n${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`not JSON for ${path}: ${text.slice(0, 200)}`);
  }
}

// "discover": print the price-index series EVDS offers, to pick / verify the codes.
// `discover` lists categories; `discover <category id>` its data groups; `discover <group code>`
// its series.
if (process.argv[2] === 'discover') {
  const arg = process.argv[3] || process.env.DISCOVER || '';
  const show = (rows) => {
    if (!Array.isArray(rows)) return console.log(JSON.stringify(rows).slice(0, 1500));
    console.log(`${rows.length} rows; fields: ${Object.keys(rows[0] ?? {}).join(', ')}`);
    for (const r of rows) console.log('  ' + Object.values(r).map((v) => String(v).slice(0, 70)).join(' | '));
  };
  if (!arg) show(await get('categories/type=json'));
  else if (/^\d+$/.test(arg)) show(await get(`datagroups/mode=2&code=${arg}&type=json`));
  else show(await get(`serieList/type=json&code=${arg}`));
  process.exit(0);
}

const pad = (n) => String(n).padStart(2, '0');
const key = (y, m) => `${y}-${pad(m)}`;

/** Monthly index values { 'YYYY-MM': number } for a series. */
async function series(code, fromYear) {
  const now = new Date();
  const json = await get(`series=${code}&startDate=01-01-${fromYear}&endDate=01-${pad(now.getUTCMonth() + 1)}-${now.getUTCFullYear() + 1}&type=json`);
  const field = code.replace(/\./g, '_');
  const out = {};
  for (const item of json.items ?? []) {
    const v = item[field];
    const m = /^(\d{4})-(\d{1,2})$/.exec(item.Tarih ?? '');
    if (m && v != null && v !== '' && isFinite(Number(v))) out[key(m[1], Number(m[2]))] = Number(v);
  }
  return out;
}

const startYear = new Date().getUTCFullYear() - 3;
const fresh = await series(NEW_CODE, startYear);
let old = {};
try {
  old = await series(OLD_CODE, startYear);
} catch (e) {
  console.warn('old series unavailable:', e.message.split('\n')[0]);
}
// Chain the old base onto the new one at the first month both have.
const overlap = Object.keys(fresh).sort().find((k) => old[k]);
const factor = overlap ? fresh[overlap] / old[overlap] : null;
const idx = {};
if (factor) for (const [k, v] of Object.entries(old)) idx[k] = v * factor;
Object.assign(idx, fresh);

const months = Object.keys(fresh).sort();
const latest = months[months.length - 1];
if (!latest) throw new Error(`no data for ${NEW_CODE}`);
const shift = (k, d) => {
  const [y, m] = k.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return key(t.getUTCFullYear(), t.getUTCMonth() + 1);
};
const at = (d) => idx[shift(latest, d)];
const need = Array.from({ length: 24 }, (_, i) => at(-i));
if (need.some((v) => v == null)) throw new Error(`not enough history before ${latest} (overlap ${overlap ?? 'none'})`);
const avg = (a, b) => need.slice(a, b).reduce((s, v) => s + v, 0) / (b - a);
const r2 = (n) => Math.round(n * 100) / 100;
const tufe = {
  monthly: r2((at(0) / at(-1) - 1) * 100),
  annual: r2((at(0) / at(-12) - 1) * 100),
  avg12: r2((avg(0, 12) / avg(12, 24) - 1) * 100),
};

// Next announcement: the 3rd of the month after next data month + 1, moved past weekends and
// fixed public holidays (moving religious holidays aren't known here; the app re-checks daily).
const FIXED = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];
function nextRelease(afterKey) {
  const [y, m] = shift(afterKey, 2).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 3));
  while ([0, 6].includes(d.getUTCDay()) || FIXED.includes(`${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const prev = JSON.parse(readFileSync(FILE, 'utf8'));
console.log('latest month', latest, 'computed', tufe, 'chained at', overlap, '| file has', prev.period, prev.tufe);

// Sanity: plausible ranges; and if this month is already published, it must agree.
const bad = [tufe.monthly, tufe.annual, tufe.avg12].some((v) => !isFinite(v) || v < -20 || v > 200);
if (bad) throw new Error('implausible values, not writing');
if (latest === prev.period) {
  const off = ['monthly', 'annual', 'avg12'].filter((k) => Math.abs(tufe[k] - prev.tufe[k]) > 0.02);
  if (off.length) throw new Error(`computed ${latest} differs from the published file (${off.join(', ')}) — check the series codes`);
  console.log('already up to date');
  process.exit(0);
}
if (latest < prev.period) throw new Error('EVDS is behind the file, not writing');

const today = new Date().toISOString().slice(0, 10);
const next = { period: latest, announced: today, next: nextRelease(latest), tufe, source: 'TÜİK' };
writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
console.log('updated →', next);
