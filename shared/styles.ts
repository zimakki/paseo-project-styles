import type { RowState } from "./row-state";

// Paseo's sidebar renders each project as
//   div[role="group"][aria-label=<project name>]
//     div > [data-testid="sidebar-project-row-…"]
//     [data-testid="sidebar-workspace-list-…"] > [data-testid="sidebar-workspace-row-…"]…
// These test IDs are not a public API, so a Paseo release can change them.
export const PROJECT_ROW = '[data-testid^="sidebar-project-row-"]';
export const PROJECT_GROUP = `[role="group"]:has(${PROJECT_ROW})`;
const WORKSPACE_LIST = `${PROJECT_GROUP} > [data-testid^="sidebar-workspace-list-"]`;

export interface SidebarRowStates {
  workspaces: ReadonlyMap<string, RowState>;
  projects: ReadonlyMap<string, RowState>;
}

const FALLBACK_RAIL = "#8a8fb0";
const PALETTE = ["#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#ef4444"];

// Projects bigger and bold; workspaces smaller and indented behind a rail in the project colour.
export const BASE_CSS = `
${PROJECT_GROUP} > div:has(> ${PROJECT_ROW}) { padding-top: 8px; }
${PROJECT_ROW} div[dir="auto"] { font-size: 15px !important; font-weight: 600 !important; }
${WORKSPACE_LIST} { position: relative; padding-left: 14px; }
${WORKSPACE_LIST}::before { content: ""; position: absolute; left: 6px; top: 2px; bottom: 2px; width: 3px; border-radius: 3px; background: var(--project-rail, ${FALLBACK_RAIL}); opacity: 0.75; pointer-events: none; }
${WORKSPACE_LIST} [data-testid^="sidebar-workspace-row-"] div[dir="auto"] { font-size: 13px !important; }
`;

// Every workspace row, pinned or in a project, holds one
//   [data-testid="workspace-status-indicator-<status>"]
// and a collapsed project row holds a
//   [data-testid="project-status-indicator-<status>"]
// carrying the most urgent status of its hidden workspaces (expanded projects show none).
// Pinned rows are the exception: they show a project icon whose badge has no status in its test
// ID, only an English accessibility label, so they are matched on that label. Another app
// language leaves pinned rows unstyled.
// The whole row then shows the status. Running gets a moving shimmer; attention (finished,
// not yet viewed), needs input and failed get a wash that fades to the right. The colour goes in
// background-image so Paseo's hover and selected background colours still show through.
const ROW = '[data-testid^="sidebar-workspace-row-"]';
const PINNED_LABELS: Record<string, string> = {
  running: "Working",
  attention: "Ready to review",
  needs_input: "Needs input",
  failed: "Failed",
};
const status = (name: string) =>
  `:is(${[
    `${ROW}:has([data-testid="workspace-status-indicator-${name}"])`,
    `${ROW}:has([data-testid^="sidebar-row-project-icon-"] [role="status"][aria-label="${PINNED_LABELS[name]}"])`,
    `${PROJECT_ROW}:has([data-testid="project-status-indicator-${name}"])`,
  ].join(", ")})`;
// The open workspace gets a ring in its project's colour so it stays findable whatever its status
// wash. Paseo sets aria-selected on the open row. The ring is an outline because outlines paint
// above the row's content and the running sweep. Pinned rows sit outside any project group, so
// they have no --project-rail and use the fallback colour.
const OPEN_ROW = `${ROW}[aria-selected="true"]`;
const wash = (rgb: string) =>
  `background-image: linear-gradient(90deg, rgba(${rgb}, 0.28), rgba(${rgb}, 0.04) 85%) !important;`;

// Until the plugin has the agent list, rows show Paseo's own status as a wash. A running row gets
// a moving sweep; attention (finished, not yet viewed), needs input and failed get a wash that
// fades to the right. The colour goes in background-image so Paseo's hover and selected background
// colours still show through.
const BLUE = "59, 130, 246";
const SLATE = "148, 163, 184";
const COLOURS = { needs_input: "234, 179, 8", failed: "239, 68, 68", attention: "34, 197, 94", running: BLUE, done: SLATE };
const sweep = (row: string) => `
${row} { overflow: hidden; background-image: linear-gradient(rgba(${BLUE}, 0.08), rgba(${BLUE}, 0.08)) !important; }
${row}::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(100deg, transparent 20%, rgba(${BLUE}, 0.3) 50%, transparent 80%); background-size: 200% 100%; animation: paseo-project-styles-sweep 1.8s linear infinite; }
@media (prefers-reduced-motion: reduce) { ${row}::after { animation: none; background: rgba(${BLUE}, 0.12); } }`;

export const STATUS_CSS = `
:is(${ROW}, ${PROJECT_ROW}) { position: relative; }
${OPEN_ROW} { outline: 1.5px solid var(--project-rail, ${FALLBACK_RAIL}) !important; outline-offset: -1.5px !important; }
${OPEN_ROW} div[dir="auto"] { font-weight: 600 !important; }
@keyframes paseo-project-styles-sweep { from { background-position: 150% 0; } to { background-position: -50% 0; } }
`;

export const FALLBACK_STATUS_CSS = `${sweep(status("running"))}
${status("attention")} { ${wash(COLOURS.attention)} }
${status("needs_input")} { ${wash(COLOURS.needs_input)} }
${status("failed")} { ${wash(COLOURS.failed)} }
`;

// Once the agent list is in, each row with agents gets rules for its own test ID, built from
// RowState (see row-state.ts):
//   primary      wash in its colour, or the sweep for an agent at work
//   alsoWorking  a thin blue line sweeping along the bottom edge
//   background   a terminal icon with a blinking cursor replaces Paseo's status dot, in the
//                primary colour, with a count badge when there are several
// Paseo's status dot is hidden whenever it would say something else: its blue spinner when an
// agent is at work (the sweep already says so), and its status when the plugin ranks differently.
const INDICATOR = `:is([data-testid^="workspace-status-indicator-"], [data-testid^="project-status-indicator-"], [data-testid^="sidebar-row-project-icon-"] [role="status"])`;

function terminal(rgb: string, blink: boolean): string {
  const cursor = blink
    ? `<path d='M8.5 10h3'><animate attributeName='opacity' values='1;0' dur='1.1s' calcMode='discrete' repeatCount='indefinite'/></path>`
    : `<path d='M8.5 10h3'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='rgb(${rgb})' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><rect x='1.5' y='2.5' width='13' height='11' rx='2'/><path d='M4.5 6.5l2 1.5-2 1.5'/>${cursor}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function rowRules(row: string, state: RowState): string {
  const rules: string[] = [];
  const colour = COLOURS[state.primary];
  if (state.primary === "running") rules.push(sweep(row));
  else if (state.primary !== "done") rules.push(`${row} { ${wash(colour)} }`);
  if (state.alsoWorking)
    rules.push(`${row} { overflow: hidden; }
${row}::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; pointer-events: none; background: linear-gradient(90deg, transparent 20%, rgb(${BLUE}) 50%, transparent 80%); background-size: 200% 100%; animation: paseo-project-styles-sweep 1.8s linear infinite; }
@media (prefers-reduced-motion: reduce) { ${row}::after { animation: none; background: rgba(${BLUE}, 0.7); } }`);

  const slot = `${row} ${INDICATOR}`;
  const hideDot = `${slot} > * { opacity: 0 !important; }`;
  if (state.background > 0) {
    rules.push(`${hideDot}
${slot} { position: relative; overflow: visible !important; background: ${terminal(colour, true)} center / 14px 14px no-repeat !important; }
@media (prefers-reduced-motion: reduce) { ${slot} { background-image: ${terminal(colour, false)} !important; } }`);
    if (state.background > 1)
      rules.push(`${slot}::after { content: "${state.background}"; position: absolute; right: -6px; top: -6px; font-size: 9px; line-height: 1; font-weight: 700; padding: 1px 2px; border-radius: 6px; color: rgb(${colour}); background: rgba(20, 20, 28, 0.85); pointer-events: none; }`);
  } else if (state.primary === "running") {
    rules.push(hideDot);
  } else if (state.alsoWorking) {
    // Paseo shows a spinner here, because it ranks working above finished.
    rules.push(`${hideDot}
${slot} { background: radial-gradient(circle, rgb(${colour}) 3.5px, transparent 4px) center / 14px 14px no-repeat !important; }`);
  }
  return rules.join("\n");
}

// `rows` is null until the agent list has loaded; until then rows keep Paseo's own status.
export function rowsCss(rows: SidebarRowStates | null): string {
  if (rows === null) return FALLBACK_STATUS_CSS;
  const css: string[] = [];
  for (const [key, state] of rows.workspaces)
    css.push(rowRules(`${ROW}[data-testid=${JSON.stringify(`sidebar-workspace-row-${key}`)}]`, state));
  // A project row only shows status while collapsed; Paseo then gives it a status indicator.
  for (const [key, state] of rows.projects)
    css.push(rowRules(`${PROJECT_ROW}[data-testid=${JSON.stringify(`sidebar-project-row-${key}`)}]:has([data-testid^="project-status-indicator-"])`, state));
  return css.filter(Boolean).join("\n");
}

// Letter avatars are SVG data URIs whose letter colour sits in `text { fill: … }`.
export function avatarColour(svg: string): string | undefined {
  const match = /text\s*\{\s*fill:\s*([^;}]+)/.exec(svg);
  const colour = match?.[1].trim();
  return colour && /^[#\w%.,()\s-]+$/.test(colour) ? colour : undefined;
}

export function paletteColour(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function railCss(colours: ReadonlyMap<string, string>): string {
  return [...colours]
    .map(([name, colour]) => `[role="group"][aria-label=${JSON.stringify(name)}] { --project-rail: ${colour}; }`)
    .join("\n");
}
