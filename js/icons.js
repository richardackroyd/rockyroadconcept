/** Cartoon SVG icons for Rocky Road Hub concept maps */

const ink = "#152028";

function svgWrap(inner, { size = 40, view = 40 } = {}) {
  return `<svg class="rr-icon" width="${size}" height="${size}" viewBox="0 0 ${view} ${view}" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Road character icons (list + map badges) */
export function roadIcon(kind, size = 40) {
  const k = kind || "road";
  const drawings = {
    twisty: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#ffe0b8"/>
      <path d="M8 28 C14 10, 18 30, 24 14 S32 8, 34 18" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M8 28 C14 10, 18 30, 24 14 S32 8, 34 18" fill="none" stroke="#e85d04" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 5"/>
      <circle cx="8" cy="28" r="2.4" fill="#ffd166"/>
      <circle cx="34" cy="18" r="2.4" fill="#ffd166"/>`,
    traffic: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#ffd6d6"/>
      <rect x="14" y="6" width="12" height="28" rx="4" fill="${ink}"/>
      <circle cx="20" cy="13" r="3.2" fill="#e63946"/>
      <circle cx="20" cy="20" r="3.2" fill="#ffd166"/>
      <circle cx="20" cy="27" r="3.2" fill="#2f9e6b"/>`,
    wind: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#d7eef8"/>
      <path d="M6 14 H24 C28 14 28 8 24 8" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M6 20 H28 C33 20 33 12 28 12" fill="none" stroke="#0077b6" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M6 26 H22 C26 26 26 31 22 31" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`,
    climb: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#d9f0e3"/>
      <path d="M6 30 L16 14 L22 22 L28 10 L34 30 Z" fill="#1f6b4a"/>
      <path d="M16 14 L19 18 L22 22" fill="none" stroke="#fff" stroke-width="1.6"/>
      <path d="M8 30 H32" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`,
    lane: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#efe8d8"/>
      <path d="M12 6 L10 34" stroke="#c4b59a" stroke-width="2"/>
      <path d="M28 6 L30 34" stroke="#c4b59a" stroke-width="2"/>
      <path d="M18 6 L16 34" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M22 6 L24 34" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M20 8 V14 M20 18 V24 M20 28 V34" stroke="#ffd166" stroke-width="2" stroke-linecap="round"/>`,
    scenic: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#fff0c8"/>
      <circle cx="28" cy="12" r="5" fill="#ffb020"/>
      <path d="M6 28 C12 20, 18 24, 22 18 S30 16, 34 22 V32 H6 Z" fill="#2f9e6b"/>
      <path d="M6 32 H34" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`,
    moor: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#e7f0d8"/>
      <ellipse cx="20" cy="26" rx="12" ry="7" fill="#95d5b2"/>
      <circle cx="15" cy="18" r="5" fill="#f4f1ea" stroke="${ink}" stroke-width="1.5"/>
      <circle cx="25" cy="17" r="5.5" fill="#f4f1ea" stroke="${ink}" stroke-width="1.5"/>
      <circle cx="14" cy="17" r="1" fill="${ink}"/>
      <circle cx="24" cy="16" r="1" fill="${ink}"/>
      <path d="M8 30 H32" stroke="${ink}" stroke-width="2"/>`,
    cold: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#e3f2fd"/>
      <path d="M20 8 V32 M12 14 L28 26 M28 14 L12 26" stroke="#0077b6" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="20" cy="8" r="2" fill="#fff" stroke="#0077b6" stroke-width="1.5"/>
      <circle cx="20" cy="32" r="2" fill="#fff" stroke="#0077b6" stroke-width="1.5"/>`,
    road: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#e8ecef"/>
      <path d="M14 6 L10 34 H30 L26 6 Z" fill="${ink}"/>
      <path d="M20 8 V14 M20 18 V24 M20 28 V33" stroke="#ffd166" stroke-width="2.2" stroke-linecap="round"/>`,
    /** A35 — dual carriageway vanishing away (dull / utilitarian) */
    dual: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#d8dde2"/>
      <path d="M6 34 L16 8 H24 L34 34 Z" fill="#6b7280"/>
      <path d="M11 34 L18 10 H22 L29 34 Z" fill="#4b5563"/>
      <path d="M20 10 V14 M20 17 V21 M20 24 V28 M20 31 V34" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14.5 34 L18.2 12" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3"/>
      <path d="M25.5 34 L21.8 12" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3"/>
      <rect x="15" y="6" width="10" height="3" rx="1" fill="#9ca3af"/>`,
    /** A354 — small town silhouette */
    town: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#efe6d6"/>
      <path d="M4 30 H36" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
      <rect x="6" y="18" width="8" height="12" fill="#c4a882" stroke="${ink}" stroke-width="1.4"/>
      <rect x="8" y="21" width="2" height="2.5" fill="#fff8e7"/>
      <rect x="11" y="21" width="2" height="2.5" fill="#fff8e7"/>
      <rect x="8" y="25" width="2" height="2.5" fill="#fff8e7"/>
      <rect x="15" y="12" width="10" height="18" fill="#d4b896" stroke="${ink}" stroke-width="1.4"/>
      <path d="M15 12 L20 7 L25 12 Z" fill="#8b5e34" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="18.5" y="22" width="3" height="8" fill="${ink}"/>
      <rect x="17" y="15" width="2.2" height="2.2" fill="#fff8e7"/>
      <rect x="21" y="15" width="2.2" height="2.2" fill="#fff8e7"/>
      <rect x="27" y="16" width="7" height="14" fill="#b8956c" stroke="${ink}" stroke-width="1.4"/>
      <rect x="28.5" y="19" width="2" height="2.2" fill="#fff8e7"/>
      <rect x="31.5" y="19" width="2" height="2.2" fill="#fff8e7"/>
      <circle cx="30.5" cy="12" r="2.2" fill="#2f9e6b"/>
      <path d="M10 30 H30" stroke="#5c6670" stroke-width="3" stroke-linecap="round"/>
      <path d="M12 30 H28" stroke="#ffd166" stroke-width="1.2" stroke-dasharray="2 3"/>`,
    /** B3157 — twisty tarmac ribbon */
    "twisty-tarmac": `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#ffe8cc"/>
      <path d="M7 30 C10 18, 14 32, 18 16 S26 10, 28 20 S32 28, 34 18"
        fill="none" stroke="#3d4450" stroke-width="7" stroke-linecap="round"/>
      <path d="M7 30 C10 18, 14 32, 18 16 S26 10, 28 20 S32 28, 34 18"
        fill="none" stroke="#e85d04" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M7 30 C10 18, 14 32, 18 16 S26 10, 28 20 S32 28, 34 18"
        fill="none" stroke="#ffd166" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2.5 4"/>
      <circle cx="7" cy="30" r="2.2" fill="#ffd166" stroke="${ink}" stroke-width="1"/>
      <circle cx="34" cy="18" r="2.2" fill="#ffd166" stroke="${ink}" stroke-width="1"/>`,
    /** Portland Road — sea / coast */
    sea: `
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#cfe8f5"/>
      <circle cx="28" cy="11" r="4.5" fill="#ffb020"/>
      <path d="M4 22 C10 18, 14 26, 20 22 S28 18, 36 22 V34 H4 Z" fill="#0077b6"/>
      <path d="M4 22 C10 18, 14 26, 20 22 S28 18, 36 22" fill="none" stroke="#023e8a" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M6 27 C11 24, 15 30, 21 27 S29 24, 34 28" fill="none" stroke="#48cae4" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M5 31 C10 29, 14 33, 20 31 S28 29, 35 32" fill="none" stroke="#90e0ef" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M8 20 L10 16 L12 20" fill="#2f9e6b" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`,
  };
  return svgWrap(drawings[k] || drawings.road, { size });
}

/** Stop / annotation icons on the cartoon map and lists */
export function stopIcon(type, size = 36) {
  const t = type || "sight";
  const drawings = {
    start: `
      <circle cx="20" cy="20" r="16" fill="#b7e4c7" stroke="${ink}" stroke-width="2"/>
      <path d="M13 22 L18 27 L28 14" fill="none" stroke="#1f6b4a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    twisty: `
      <circle cx="20" cy="20" r="16" fill="#ffd6a5" stroke="${ink}" stroke-width="2"/>
      <path d="M10 24 C14 10, 18 28, 23 14 S30 12, 31 20" fill="none" stroke="#e85d04" stroke-width="3" stroke-linecap="round"/>`,
    sight: `
      <circle cx="20" cy="20" r="16" fill="#a8dadc" stroke="${ink}" stroke-width="2"/>
      <rect x="11" y="14" width="18" height="13" rx="3" fill="#fff" stroke="#0077b6" stroke-width="2"/>
      <circle cx="20" cy="20.5" r="3.5" fill="none" stroke="#0077b6" stroke-width="2"/>
      <rect x="16" y="11" width="8" height="4" rx="1.5" fill="#0077b6"/>`,
    hotel: `
      <circle cx="20" cy="20" r="16" fill="#cddafd" stroke="${ink}" stroke-width="2"/>
      <path d="M10 26 V16 L20 10 L30 16 V26 Z" fill="#fff" stroke="#3d5a80" stroke-width="2" stroke-linejoin="round"/>
      <rect x="17" y="20" width="6" height="6" fill="#3d5a80"/>`,
    food: `
      <circle cx="20" cy="20" r="16" fill="#ffb4a2" stroke="${ink}" stroke-width="2"/>
      <path d="M14 12 V26 M14 12 C18 12 18 18 14 18 M26 12 V26 M23 12 H29" stroke="#c1121f" stroke-width="2.4" stroke-linecap="round"/>`,
    dull: `
      <circle cx="20" cy="20" r="16" fill="#dfe3e6" stroke="${ink}" stroke-width="2"/>
      <path d="M12 22 H28" stroke="#8a9096" stroke-width="3" stroke-linecap="round"/>
      <circle cx="15" cy="16" r="1.6" fill="#8a9096"/>
      <circle cx="25" cy="16" r="1.6" fill="#8a9096"/>`,
  };
  return svgWrap(drawings[t] || drawings.sight, { size });
}

/** Tiny icon for embedding inside SVG map (uses foreignObject-free path group) */
export function stopIconSvgGroup(type, cx, cy, scale = 1) {
  // Use a compact symbol via nested svg
  const html = stopIcon(type, 32);
  // Extract inner of the svg for embedding - simpler: use image-like nested svg
  const inner = html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<svg x="${cx - 16 * scale}" y="${cy - 16 * scale}" width="${32 * scale}" height="${32 * scale}" viewBox="0 0 40 40" style="pointer-events:none">${inner}</svg>`;
}

export function roadIconSvgBadge(kind, x, y, scale = 0.7) {
  const html = roadIcon(kind, 40);
  const inner = html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const s = 36 * scale;
  return `<svg x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" viewBox="0 0 40 40" style="pointer-events:none">${inner}</svg>`;
}
