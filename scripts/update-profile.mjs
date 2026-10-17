// Refresh stats (heatmap, streak, XP) di assets/profile.svg + cache-bust README.
// Data dari API publik contributions; jalankan manual: node scripts/update-profile.mjs
import { readFile, writeFile } from "node:fs/promises";

const USER = "KurniawanSatria";
const API = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`;

const { contributions } = await (await fetch(API)).json();
if (!Array.isArray(contributions) || contributions.length < 300) {
  throw new Error(`Data contributions tidak lengkap (${contributions?.length} hari)`);
}

// --- statistik ---
const total = contributions.reduce((s, d) => s + d.count, 0);
const activeDays = contributions.filter((d) => d.count > 0).length;
const bestDay = contributions.reduce((b, d) => (d.count > b.count ? d : b)).count;

function streak(days) {
  let cur = 0, best = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  for (let i = days.length - 1; i >= 0 && days[i].count > 0; i--) cur++;
  // hari terakhir belum berkontribusi dianggap belum memutus streak
  if (days.at(-1).count === 0 && days.at(-2)?.count > 0) {
    cur = 0;
    for (let i = days.length - 2; i >= 0 && days[i].count > 0; i--) cur++;
  }
  return [cur, best];
}
const [currentStreak, longestStreak] = streak(contributions);

// shortcut: XP disederhanakan = total kontribusi 12 bulan, level = xp/220 + 1
// (semantik XP asli generator lama tidak diketahui); naikkan skala di sini jika ingin leveling lain.
const xp = total;
const level = Math.min(10, Math.floor(xp / 220) + 1);
const filled = Math.min(20, Math.round((xp / 2200) * 20));

// --- heatmap: grid 53 kolom x 7 baris, kolom mulai hari Minggu ---
const first = new Date(contributions[0].date + "T00:00:00Z");
const lead = first.getUTCDay(); // sel kosong sebelum hari pertama
const cells = [...Array(lead).fill(null), ...contributions];
const OPACITY = { 1: 0.3, 2: 0.5, 3: 0.75, 4: 1 };
const cell = (i) => {
  const col = Math.floor(i / 7), row = i % 7;
  return { x: (48 + col * 13.285).toFixed(2), y: (172 + row * 13.285).toFixed(2) };
};

const base = cells
  .map((d, i) => (d ? `<use href="#gs-gs-c" x="${cell(i).x}" y="${cell(i).y}"/>` : ""))
  .join("\n");
const layer = cells
  .map((d, i) => {
    if (!d || d.level === 0) return "";
    const { x, y } = cell(i);
    return `<use href="#gs-gs-c" x="${x}" y="${y}" fill-opacity="${OPACITY[d.level]}"/>`;
  })
  .filter(Boolean)
  .join("\n");

// --- tulis ulang bagian stats SVG (antara gs-heat-base dan </svg> section stats) ---
const svgPath = "assets/profile.svg";
const svg = await readFile(svgPath, "utf8");
const start = svg.indexOf('<g class="gs-heat-base"');
const end = svg.indexOf("</svg>", start);
if (start === -1 || end === -1) throw new Error("Marker section stats tidak ditemukan di profile.svg");

const stat = (label, value, note, cls) =>
`  <g transform="translate(${label.x} 306)">
    <g class="gs-stat ${cls}">
      <text x="0" y="0" fill="#a3a3a3" font-family="ui-monospace, monospace" font-size="10" letter-spacing="2">${label.t}</text>
      <text x="0" y="38" fill="#ffffff" font-family='"Inter", system-ui, sans-serif' font-size="34" font-weight="700" letter-spacing="-1">${value}</text>
      <text x="0" y="58" fill="#a3a3a3" font-family='"Inter", system-ui, sans-serif' font-size="11" font-weight="400">${note}</text>
    </g>
  </g>`;

const stats = [
  { t: "CURRENT STREAK", x: 0, v: currentStreak, n: "days", c: "gs-s4" },
  { t: "LONGEST STREAK", x: 224, v: longestStreak, n: "days · all time", c: "gs-s5" },
  { t: "ACTIVE DAYS", x: 400, v: activeDays, n: "all time", c: "gs-s6" },
  { t: "BEST DAY", x: 576, v: bestDay, n: "contributions", c: "gs-s7" },
];

const slots = Array.from({ length: 20 }, (_, i) => {
  const x = (48 + i * 35.4).toFixed(1);
  if (i < filled - 1) return `    <rect x="${x}" y="406" width="31.4" height="10" rx="5" fill="#ffffff"/>`;
  if (i === filled - 1) return `    <rect class="gs-xp-tip" x="${x}" y="406" width="31.4" height="10" rx="5" fill="#ffffff"/>`;
  return `    <rect x="${x}" y="406" width="31.4" height="10" rx="5" fill="#a3a3a3" fill-opacity="0.18"/>`;
}).join("\n");

const block = `<g class="gs-heat-base" fill="#a3a3a3" fill-opacity="0.10">${base}
  </g>
  <g class="gs-heat-layer" fill="#ffffff">${layer}
  </g>


${stats.map((s) => stat(s, s.v, s.n, s.c)).join("\n\n")}

  <g class="gs-xp">
    <text x="48" y="392" fill="#ffffff" font-family="ui-monospace, monospace" font-size="12" font-weight="700" letter-spacing="2">LVL ${level}</text>
    <text x="752" y="392" fill="#a3a3a3" font-family="ui-monospace, monospace" font-size="10" letter-spacing="1.4" text-anchor="end">${xp} / 2200 XP — NEXT LVL</text>
  </g>
  <g class="gs-xp-bar">
${slots}
  </g>
`;

let out =
  svg.slice(0, start) +
  block +
  svg.slice(end);

out = out.replace(
  /(<text class="gs-meta"[\s\S]*?)\d+ XP/,
  `$1${xp} XP`,
);
out = out.replace(/\d+ CONTRIBUTIONS ·/, `${total} CONTRIBUTIONS ·`);

await writeFile(svgPath, out);

// --- cache-bust README (GitHub meng-cache gambar README) ---
const readmePath = "README.md";
const readme = await readFile(readmePath, "utf8");
const v = contributions.at(-1).date;
const updated = /profile\.svg\?v=/.test(readme)
  ? readme.replace(/profile\.svg\?v=\d{4}-\d{2}-\d{2}/, `profile.svg?v=${v}`)
  : readme.replace(/profile\.svg/, `profile.svg?v=${v}`);
await writeFile(readmePath, updated);

console.log(`OK: ${total} kontribusi · streak ${currentStreak}/${longestStreak} · aktif ${activeDays} hari · best ${bestDay} · LVL ${level} (${xp} XP)`);
