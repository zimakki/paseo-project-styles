// Paseo's sidebar renders each project as
//   div[role="group"][aria-label=<project name>]
//     div > [data-testid="sidebar-project-row-…"]
//     [data-testid="sidebar-workspace-list-…"] > [data-testid="sidebar-workspace-row-…"]…
// These test IDs are not a public API, so a Paseo release can change them.
export const PROJECT_ROW = '[data-testid^="sidebar-project-row-"]';
export const PROJECT_GROUP = `[role="group"]:has(${PROJECT_ROW})`;
const WORKSPACE_LIST = `${PROJECT_GROUP} > [data-testid^="sidebar-workspace-list-"]`;

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
const wash = (rgb: string) =>
  `background-image: linear-gradient(90deg, rgba(${rgb}, 0.28), rgba(${rgb}, 0.04) 85%) !important;`;

export const STATUS_CSS = `
:is(${ROW}, ${PROJECT_ROW}) { position: relative; }
${status("running")} { overflow: hidden; background-image: linear-gradient(rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.08)) !important; }
${status("running")}::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(100deg, transparent 20%, rgba(59, 130, 246, 0.3) 50%, transparent 80%); background-size: 200% 100%; animation: paseo-project-styles-sweep 1.8s linear infinite; }
${status("attention")} { ${wash("34, 197, 94")} }
${status("needs_input")} { ${wash("234, 179, 8")} }
${status("failed")} { ${wash("239, 68, 68")} }
@keyframes paseo-project-styles-sweep { from { background-position: 150% 0; } to { background-position: -50% 0; } }
@media (prefers-reduced-motion: reduce) { ${status("running")}::after { animation: none; background: rgba(59, 130, 246, 0.12); } }
`;

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
