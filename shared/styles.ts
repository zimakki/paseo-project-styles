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
