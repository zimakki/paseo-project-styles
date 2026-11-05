import { Platform } from "react-native";
import { avatarColour, BASE_CSS, paletteColour, PROJECT_GROUP, PROJECT_ROW, railCss } from "../shared/styles";

// This plugin typechecks without the DOM library. Declare only what this module uses.
interface ElementLike {
  getAttribute(name: string): string | null;
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
}
interface StyleElement {
  textContent: string | null;
  remove(): void;
}
interface DocumentLike {
  head: { appendChild(node: StyleElement): void };
  body: ElementLike;
  createElement(tag: "style"): StyleElement;
}
interface MutationObserverLike {
  observe(target: ElementLike, options: { childList: boolean; subtree: boolean }): void;
  disconnect(): void;
}
declare const document: DocumentLike;
declare const MutationObserver: new (callback: () => void) => MutationObserverLike;
declare function atob(data: string): string;

function decodeSvg(src: string): string {
  const base64 = /^data:image\/svg\+xml;base64,(.*)$/.exec(src);
  if (base64) return atob(base64[1]);
  const plain = /^data:image\/svg\+xml[^,]*,(.*)$/.exec(src);
  return plain ? decodeURIComponent(plain[1]) : "";
}

function projectColours(): Map<string, string> {
  const colours = new Map<string, string>();
  for (const group of Array.from(document.body.querySelectorAll(PROJECT_GROUP))) {
    const name = group.getAttribute("aria-label");
    if (!name) continue;
    const src = group.querySelector(`${PROJECT_ROW} img`)?.getAttribute("src") ?? "";
    colours.set(name, avatarColour(decodeSvg(src)) ?? paletteColour(name));
  }
  return colours;
}

// Injects the sidebar styles and keeps the per-project rail colours current. Returns cleanup.
export function injectProjectStyles(): () => void {
  if (Platform.OS !== "web") return () => {};

  const base = document.createElement("style");
  base.textContent = BASE_CSS;
  document.head.appendChild(base);

  const rails = document.createElement("style");
  document.head.appendChild(rails);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const render = () => {
    timer = undefined;
    const css = railCss(projectColours());
    if (rails.textContent !== css) rails.textContent = css;
  };
  const schedule = () => {
    timer ??= setTimeout(render, 250);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  render();

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
    base.remove();
    rails.remove();
  };
}
