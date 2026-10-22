#!/usr/bin/env node
// Renders profile/README.md, the organization's public GitHub profile.
// The port directory comes from the website's published snapshot (landing/data/ports.json), which the
// landing sync-ports workflow builds from every repository's validated port.json. Built-ins only.
//
//   node scripts/profile.mjs            fetch the published snapshot and write profile/README.md
//   node scripts/profile.mjs --check    fail if profile/README.md is out of date
//   PORTS_SNAPSHOT=path/to/ports.json   use a local snapshot instead of fetching
import { readFile, writeFile } from "node:fs/promises";

const SNAPSHOT_URL = "https://raw.githubusercontent.com/living-code-theme/landing/main/data/ports.json";
const RAW = "https://raw.githubusercontent.com/living-code-theme/core/main";
const ORG = "https://github.com/living-code-theme";
const REQUEST = "https://github.com/living-code-theme/core/issues/new?template=port-request.yml";
const OUTPUT = new URL("../profile/README.md", import.meta.url);
// Website order; groups the website adds later are appended alphabetically rather than dropped.
const GROUP_ORDER = ["Editors", "Terminals", "CLI & TUI", "AI & Agents", "Browsers", "Apps", "Web & code", "Theme systems"];

const html = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Badges match the port READMEs (core/scripts/readme-template.mjs): for-the-badge, Night surface2
// labels, Night values bright enough for shields' dark text, and icons drawn in the value color.
const C = { label: "2d3438", teal: "00a692", aqua: "9ae0dd", amber: "f0be6d", green: "abe2a4", blue: "a1cfe8" };
const LC_GLYPHS = [
  [0, "M185 -110V830H465V715H310V5H465V-110Z"],
  [520, "M389 0Q307 0 257.5 49Q208 98 208 178V617H27V730H333V181Q333 150 350.5 131.5Q368 113 398 113H559V0Z"],
  [1040, "M309 -10Q238 -10 185.5 16.5Q133 43 104 91.5Q75 140 75 206V344Q75 410 104 458.5Q133 507 185.5 533.5Q238 560 309 560Q412 560 474.5 506.5Q537 453 540 361H417Q414 404 384.5 427.5Q355 451 309 451Q258 451 229 423.5Q200 396 200 345V206Q200 155 229 127Q258 99 309 99Q356 99 385 122.5Q414 146 417 189H540Q537 97 474.5 43.5Q412 -10 309 -10Z"],
  [1560, "M135 -110V5H290V715H135V830H415V-110Z"],
];
const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const ICONS = {
  lc: svg("2 17 58.5 30", `<g fill="#${C.teal}" transform="translate(-1.787709 43.26257) scale(0.031285 -0.031285)">${LC_GLYPHS.map(([x, d]) => `<path transform="translate(${x} 0)" d="${d}"/>`).join("")}</g>`),
  star: svg("0 0 24 24", `<path fill="#${C.amber}" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>`),
  flavors: svg("0 0 24 24", `<g fill="#${C.green}"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" fill-opacity=".75"/><rect x="3" y="13" width="8" height="8" rx="2" fill-opacity=".5"/><rect x="13" y="13" width="8" height="8" rx="2" fill-opacity=".3"/></g>`),
  scale: svg("0 0 24 24", `<g fill="none" stroke="#${C.blue}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h14M12 3l-1 4h2z"/><path d="M5 7l-3 7a3.2 3.2 0 0 0 6 0zM19 7l-3 7a3.2 3.2 0 0 0 6 0z"/></g>`),
};
const badge = (href, src, color, icon, alt, extra = "") => {
  const logo = encodeURIComponent(`data:image/svg+xml;base64,${Buffer.from(ICONS[icon]).toString("base64")}`);
  const url = `${src}${src.includes("?") ? "&" : "?"}style=for-the-badge&labelColor=${C.label}&color=${C[color]}&logo=${logo}${extra}`;
  return `<a href="${html(href)}"><img src="${html(url)}" alt="${html(alt)}"></a>`;
};
const swatch = (hex, alt = `#${hex}`) => `<img src="${RAW}/assets/swatches/${hex}.svg" width="14" height="14" alt="${html(alt)}">`;

const ACCENTS = [["teal", "00a692"], ["mint", "52d7c1"], ["aqua", "9ae0dd"], ["steel", "80b6d3"], ["moss", "8acb83"], ["amber", "f0be6d"], ["copper", "e18c5f"], ["flare", "e96560"], ["orchid", "bf91cd"], ["rose", "ddaec3"]];
const FLAVORS = [
  ["night", "Night", "05080b", "00a692", "The default. Dark slate, teal structure, green strings, amber warnings and copper numbers."],
  ["frost", "Frost", "0a1016", "43a997", "A lifted, bluer slate with a third less chroma. Calmer for long sessions."],
  ["paper", "Paper", "f4f7f9", "187d6e", "Daylight. Near-white slate, with every syntax color kept at WCAG AA contrast."],
  ["signal", "Signal", "05080b", "00a692", "Night with a single accent. Teal marks keywords and focus; everything else stays slate."],
];

function flavorGrid() {
  const cell = ([id, name, base, accent, text]) => `<td width="50%" valign="top">
<a href="https://github.com/living-code-theme/core#living-code-${id}"><img src="${RAW}/assets/preview-${id}.png" alt="Living Code ${name}"></a><br>
${swatch(base)} ${swatch(accent)} <strong>${name}</strong><br><sub>${text}</sub>
</td>`;
  return `<table>\n<tr>\n${cell(FLAVORS[0])}\n${cell(FLAVORS[1])}\n</tr>\n<tr>\n${cell(FLAVORS[2])}\n${cell(FLAVORS[3])}\n</tr>\n</table>`;
}

/** A malformed snapshot must fail the job, never publish an empty or partial directory. */
function portDirectory(snapshot) {
  const ports = snapshot?.ports;
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("Snapshot has no ports");
  for (const port of ports) {
    for (const key of ["name", "group", "repository"]) if (typeof port[key] !== "string" || !port[key].trim()) throw new Error(`Port ${port.id ?? "?"} is missing ${key}`);
    if (!/^https:\/\/github\.com\/living-code-theme\/[A-Za-z0-9_.-]+$/.test(port.repository)) throw new Error(`Port ${port.id} has an unexpected repository: ${port.repository}`);
  }
  const groups = [...new Set(ports.map((port) => port.group.trim()))];
  const ordered = [...GROUP_ORDER.filter((g) => groups.includes(g)), ...groups.filter((g) => !GROUP_ORDER.includes(g)).sort()];
  const rows = ordered.map((group) => {
    const links = ports.filter((port) => port.group.trim() === group)
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
      .map((port) => `${port.emoji ? `${html(port.emoji)}&nbsp;` : ""}<a href="${html(port.repository)}">${html(port.name)}</a>`);
    return `<tr>\n<td valign="top"><b>${html(group)}</b></td>\n<td>${links.join(" &ensp; ")}</td>\n</tr>`;
  });
  return `<table>\n${rows.join("\n")}\n</table>`;
}

export function renderProfile(snapshot) {
  const portCount = encodeURIComponent(SNAPSHOT_URL);
  const badges = [
    badge("https://living-code.dev/ports/", `https://img.shields.io/badge/dynamic/json?url=${portCount}&query=%24.ports.length`, "aqua", "lc", "Living Code ports", "&label=ports"),
    badge(`https://github.com/orgs/living-code-theme/repositories?sort=stargazers`, "https://img.shields.io/github/stars/living-code-theme", "amber", "star", "GitHub stars"),
    badge("https://github.com/living-code-theme/core#choose-a-flavor", `https://img.shields.io/badge/flavors-4-${C.green}`, "green", "flavors", "4 flavors"),
    badge("https://github.com/living-code-theme/core/blob/main/LICENSE", `https://img.shields.io/badge/license-MIT-${C.blue}`, "blue", "scale", "MIT license"),
  ].join("\n");
  return `<!-- Generated by scripts/profile.mjs from the website's port snapshot. Edit the script, not this file. -->
<div align="center">

<a href="https://living-code.dev"><img src="${RAW}/assets/brand/github-avatar.png" width="112" height="112" alt="Living Code [lc] mark"></a>

# Living Code

**Calm slate. Living color.**<br>A color scheme where the background stays quiet and the code comes alive.<br>For editors, terminals, browsers and the web.

${ACCENTS.map(([name, hex]) => swatch(hex, `${name} #${hex}`)).join(" ")}

${badges}

[Website](https://living-code.dev) · [All ports](https://living-code.dev/ports/) · [Palette](https://github.com/living-code-theme/core) · [Request a port](${REQUEST})

</div>

## Flavors

Four flavors share one slate foundation and the same semantic roles, so a keyword, a string or an error looks the same in your editor, terminal and browser.

${flavorGrid()}

## Ports

Every port lives in its own repository, with installation steps and real screenshots of the app. Browse them with previews at [living-code.dev/ports](https://living-code.dev/ports/).

${portDirectory(snapshot)}

Missing your app? [Request a port](${REQUEST}).

## Design

- **The ground stays calm.** Backgrounds, panels, selections and comments live on one slate ramp, so the eye goes to the code, not the chrome.
- **Cool for structure, warm for data.** ${swatch("00a692")} Teal, aqua and steel mark keywords, functions and types; ${swatch("8acb83")} moss, ${swatch("f0be6d")} amber and ${swatch("e18c5f")} copper mark strings, numbers and warnings.
- **Built in OKLCH.** Every color is defined in OKLCH, and every text color is checked for WCAG AA contrast against its flavor's background.

<div align="center">

<sub>🦎 <b>One chameleon, many habitats.</b> MIT © Elliot Luque</sub>

</div>
`;
}

async function loadSnapshot() {
  if (process.env.PORTS_SNAPSHOT) return JSON.parse(await readFile(process.env.PORTS_SNAPSHOT, "utf8"));
  const response = await fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Fetching ${SNAPSHOT_URL} failed: HTTP ${response.status}`);
  return response.json();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const readme = renderProfile(await loadSnapshot());
  const current = await readFile(OUTPUT, "utf8").catch(() => "");
  if (process.argv.includes("--check")) {
    if (current !== readme) { console.error("profile/README.md is out of date; run node scripts/profile.mjs"); process.exit(1); }
    console.log("profile/README.md is up to date");
  } else if (current === readme) console.log("profile/README.md unchanged");
  else { await writeFile(OUTPUT, readme); console.log("profile/README.md updated"); }
}
