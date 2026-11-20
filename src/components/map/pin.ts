import { iconPaths, type IconName } from "@/components/icons/Icon";

/**
 * Teardrop map pin from the design handoff (T033): 38px, rotated -45deg, 3px white border,
 * white 19px icon counter-rotated. Built as plain DOM because MapLibre markers live outside React.
 */
export function createPinElement(opts: { color: string; icon: IconName; label: string }): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "bk-pin";
  root.setAttribute("aria-label", opts.label);
  root.style.setProperty("--pin-color", opts.color);

  const halo = document.createElement("span");
  halo.className = "bk-pin-halo";
  root.appendChild(halo);

  const body = document.createElement("span");
  body.className = "bk-pin-body";
  body.appendChild(iconSvg(opts.icon, 19));
  root.appendChild(body);
  return root;
}

export function setPinSelected(el: HTMLElement, selected: boolean) {
  el.classList.toggle("is-selected", selected);
}

function iconSvg(name: IconName, size: number): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of iconPaths[name]) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  return svg;
}

/** "You are here" dot: 18px green with white border and a 52px halo (handoff 1c). */
export function createUserDot(): HTMLElement {
  const el = document.createElement("span");
  el.className = "bk-user-dot";
  el.setAttribute("aria-label", "Your location");
  return el;
}
