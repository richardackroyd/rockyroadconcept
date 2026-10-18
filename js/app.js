import { roadIcon, stopIcon, stopIconSvgGroup, roadIconSvgBadge } from "./icons.js";
import { parseGpx } from "./gpx.js";

const TYPE_META = {
  start: { emoji: "🏁", label: "Start", color: "#1f6b4a" },
  twisty: { emoji: "🌀", label: "Twisty", color: "#e85d04" },
  sight: { emoji: "📸", label: "Sight", color: "#0077b6" },
  hotel: { emoji: "🏨", label: "Stay", color: "#3d5a80" },
  food: { emoji: "🍽️", label: "Food", color: "#c1121f" },
  dull: { emoji: "😴", label: "Dull bit", color: "#8a9096" },
};

const state = {
  routes: [],
  routeId: null,
  tab: "cartoon",
  story: { map: null, layer: null, markers: [] },
  elevation: { map: null, layer: null, markers: [], hoverMarker: null },
  flyalong: {
    map: null,
    layer: null,
    bike: null,
    markers: [],
    playing: false,
    raf: null,
    index: 0,
    revealed: new Set(),
  },
  cartoon: { selected: null, highlightedRoad: null, roadId: null },
};

const ROAD_PALETTE = ["#e85d04", "#1f6b4a", "#0077b6", "#9b2226", "#6a4c93", "#bc6c25"];

const TURN_ARROW = {
  left: "↰",
  right: "↱",
  straight: "↑",
  "bear-left": "↖",
  "bear-right": "↗",
  north: "↑",
  east: "→",
  south: "↓",
  "u-turn": "↶",
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function currentRoute() {
  return state.routes.find((r) => r.id === state.routeId) || state.routes[0];
}

function latLngs(route) {
  return route.points.map((p) => [p.lat, p.lon]);
}

function iconHtml(type) {
  return `<span class="icon-bubble icon-bubble--svg" data-type="${type}" aria-hidden="true">${stopIcon(type, 28)}</span>`;
}

function markerIcon(type) {
  const meta = TYPE_META[type] || TYPE_META.sight;
  return L.divIcon({
    className: "rr-marker",
    html: `<div class="rr-marker-inner rr-marker-inner--svg" style="background:${meta.color}22;border-color:#fff">${stopIcon(type, 28)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function bikeIcon() {
  return L.divIcon({
    className: "rr-marker",
    html: `<div class="rr-bike" title="You"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function fillAnnList(listEl, route, onPick) {
  listEl.innerHTML = "";
  route.annotations.forEach((ann, i) => {
    const meta = TYPE_META[ann.type] || TYPE_META.sight;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ann-item";
    btn.dataset.index = String(i);
    btn.innerHTML = `${iconHtml(ann.type)}<span><strong>${escapeHtml(ann.title)}</strong><span>${meta.label} · ${escapeHtml(ann.note)}</span></span>`;
    btn.addEventListener("click", () => onPick(ann, i, btn));
    listEl.appendChild(btn);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setActiveAnn(listEl, index) {
  $$(".ann-item", listEl).forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.index) === index);
  });
}

function tileLayer() {
  return L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  });
}

function mutedTiles() {
  return L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  });
}

/* ---------- Route picker & tabs ---------- */

function setUploadStatus(message, isError = false) {
  const el = $("#gpx-upload-status");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("is-error", Boolean(isError && message));
}

function selectRoute(routeId) {
  if (state.routeId === routeId) return;
  stopFly();
  state.routeId = routeId;
  state.cartoon.selected = null;
  state.cartoon.highlightedRoad = null;
  state.cartoon.roadId = null;
  renderRouteButtons();
  refreshActiveTab(true);
}

function setupGpxUpload() {
  const input = $("#gpx-upload");
  if (!input) return;

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    setUploadStatus(`Reading ${file.name}…`);
    try {
      const text = await file.text();
      const route = parseGpx(text, file.name);
      state.routes.push(route);
      selectRoute(route.id);
      setUploadStatus(`Added “${route.title}” (${route.distanceKm} km).`);
    } catch (err) {
      console.error(err);
      setUploadStatus(err?.message || "Could not import that GPX.", true);
    } finally {
      input.value = "";
    }
  });
}

function renderRouteButtons() {
  const wrap = $("#route-buttons");
  wrap.innerHTML = "";
  state.routes.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "route-btn" + (r.id === state.routeId ? " is-active" : "");
    btn.innerHTML = `${escapeHtml(r.title)}<small>${escapeHtml(r.region)} · ${r.distanceKm} km</small>`;
    btn.addEventListener("click", () => selectRoute(r.id));
    wrap.appendChild(btn);
  });
}

function setupTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      if (name === state.tab) return;
      if (state.tab === "flyalong") stopFly();
      state.tab = name;
      $$(".tab").forEach((t) => {
        const on = t.dataset.tab === name;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".panel").forEach((p) => {
        const on = p.dataset.panel === name;
        p.classList.toggle("is-active", on);
        p.hidden = !on;
      });
      refreshActiveTab(false);
    });
  });
}

function refreshActiveTab(routeChanged) {
  const route = currentRoute();
  if (state.tab === "story") renderStory(route, routeChanged);
  if (state.tab === "elevation") renderElevation(route, routeChanged);
  if (state.tab === "cartoon") renderCartoon(route);
  if (state.tab === "flyalong") renderFlyalong(route, routeChanged);
}

/* ---------- A. Story ribbon ---------- */

function renderStory(route, forceFit) {
  const el = $("#map-story");
  if (!state.story.map) {
    state.story.map = L.map(el, { zoomControl: true, scrollWheelZoom: true });
    mutedTiles().addTo(state.story.map);
  }

  if (state.story.layer) state.story.map.removeLayer(state.story.layer);
  state.story.markers.forEach((m) => state.story.map.removeLayer(m));
  state.story.markers = [];

  const ll = latLngs(route);
  const glow = L.polyline(ll, { color: "#fff", weight: 12, opacity: 0.85, lineCap: "round", lineJoin: "round" });
  const ribbon = L.polyline(ll, {
    color: "#e85d04",
    weight: 5,
    opacity: 1,
    lineCap: "round",
    lineJoin: "round",
    className: "story-ribbon",
  });
  const dash = L.polyline(ll, {
    color: "#ffd6a5",
    weight: 2,
    opacity: 0.9,
    dashArray: "2 10",
    lineCap: "round",
  });
  state.story.layer = L.layerGroup([glow, ribbon, dash]).addTo(state.story.map);

  const list = $("#list-story");
  fillAnnList(list, route, (ann, i) => {
    setActiveAnn(list, i);
    state.story.map.flyTo([ann.lat, ann.lon], Math.max(state.story.map.getZoom(), 12), { duration: 0.6 });
    openPopup(state.story.markers[i], ann);
  });

  route.annotations.forEach((ann, i) => {
    const m = L.marker([ann.lat, ann.lon], { icon: markerIcon(ann.type) })
      .addTo(state.story.map)
      .bindPopup(popupHtml(ann));
    m.on("click", () => setActiveAnn(list, i));
    state.story.markers.push(m);
  });

  requestAnimationFrame(() => {
    state.story.map.invalidateSize();
    if (forceFit || !state.story._fittedFor || state.story._fittedFor !== route.id) {
      state.story.map.fitBounds(L.latLngBounds(ll).pad(0.18));
      state.story._fittedFor = route.id;
    }
  });
}

function popupHtml(ann) {
  const meta = TYPE_META[ann.type] || TYPE_META.sight;
  return `<strong>${meta.emoji} ${escapeHtml(ann.title)}</strong><br/><span style="opacity:.8">${escapeHtml(ann.note)}</span>`;
}

function openPopup(marker, ann) {
  if (!marker) return;
  marker.setPopupContent(popupHtml(ann)).openPopup();
}

/* ---------- B. Elevation drama ---------- */

function segmentColors(route) {
  const colors = [];
  for (let i = 0; i < route.points.length - 1; i++) {
    const dEle = route.points[i + 1].ele - route.points[i].ele;
    const dKm = Math.max(route.cumKm[i + 1] - route.cumKm[i], 0.001);
    const grade = (dEle / (dKm * 1000)) * 100;
    if (grade > 4) colors.push("#c1121f");
    else if (grade > 1.5) colors.push("#e85d04");
    else if (grade < -4) colors.push("#0077b6");
    else if (grade < -1.5) colors.push("#48cae4");
    else colors.push("#2f9e6b");
  }
  return colors;
}

function renderElevation(route, forceFit) {
  const el = $("#map-elevation");
  if (!state.elevation.map) {
    state.elevation.map = L.map(el, { zoomControl: true });
    tileLayer().addTo(state.elevation.map);
  }

  if (state.elevation.layer) state.elevation.map.removeLayer(state.elevation.layer);
  state.elevation.markers.forEach((m) => state.elevation.map.removeLayer(m));
  state.elevation.markers = [];
  if (state.elevation.hoverMarker) {
    state.elevation.map.removeLayer(state.elevation.hoverMarker);
    state.elevation.hoverMarker = null;
  }

  const ll = latLngs(route);
  const colors = segmentColors(route);
  const segs = [];
  for (let i = 0; i < ll.length - 1; i++) {
    segs.push(
      L.polyline([ll[i], ll[i + 1]], {
        color: colors[i],
        weight: 6,
        opacity: 0.95,
        lineCap: "butt",
      })
    );
  }
  state.elevation.layer = L.layerGroup(segs).addTo(state.elevation.map);

  const list = $("#list-elevation");
  fillAnnList(list, route, (ann, i) => {
    setActiveAnn(list, i);
    state.elevation.map.flyTo([ann.lat, ann.lon], Math.max(state.elevation.map.getZoom(), 12), { duration: 0.5 });
    drawElevChart(route, ann.index);
  });

  route.annotations.forEach((ann, i) => {
    const m = L.marker([ann.lat, ann.lon], { icon: markerIcon(ann.type) }).addTo(state.elevation.map);
    m.on("click", () => {
      setActiveAnn(list, i);
      drawElevChart(route, ann.index);
    });
    state.elevation.markers.push(m);
  });

  drawElevChart(route, null);
  wireElevHover(route);

  requestAnimationFrame(() => {
    state.elevation.map.invalidateSize();
    if (forceFit || state.elevation._fittedFor !== route.id) {
      state.elevation.map.fitBounds(L.latLngBounds(ll).pad(0.18));
      state.elevation._fittedFor = route.id;
    }
  });
}

function drawElevChart(route, highlightIndex) {
  const canvas = $("#elev-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 900;
  const cssH = 150;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;
  const minE = Math.min(...route.points.map((p) => p.ele));
  const maxE = Math.max(...route.points.map((p) => p.ele));
  const span = Math.max(maxE - minE, 20);
  const maxKm = route.cumKm[route.cumKm.length - 1] || 1;

  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#1a2229";
  ctx.fillRect(0, 0, cssW, cssH);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (h * g) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.stroke();
  }

  const colors = segmentColors(route);
  for (let i = 0; i < route.points.length - 1; i++) {
    const x0 = pad.l + (route.cumKm[i] / maxKm) * w;
    const x1 = pad.l + (route.cumKm[i + 1] / maxKm) * w;
    const y0 = pad.t + h - ((route.points[i].ele - minE) / span) * h;
    const y1 = pad.t + h - ((route.points[i + 1].ele - minE) / span) * h;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // fill under
  ctx.beginPath();
  route.points.forEach((p, i) => {
    const x = pad.l + (route.cumKm[i] / maxKm) * w;
    const y = pad.t + h - ((p.ele - minE) / span) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = "rgba(47, 158, 107, 0.18)";
  ctx.fill();

  route.annotations.forEach((ann) => {
    const x = pad.l + (route.cumKm[ann.index] / maxKm) * w;
    const y = pad.t + h - ((ann.ele - minE) / span) * h;
    const meta = TYPE_META[ann.type] || TYPE_META.sight;
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "12px Figtree, sans-serif";
    ctx.fillText(meta.emoji, x - 6, y - 10);
  });

  if (highlightIndex != null) {
    const x = pad.l + (route.cumKm[highlightIndex] / maxKm) * w;
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + h);
    ctx.stroke();
    const p = route.points[highlightIndex];
    $("#elev-readout").textContent = `${route.cumKm[highlightIndex].toFixed(1)} km · ${Math.round(p.ele)} m`;
  } else {
    $("#elev-readout").textContent = `Range ${Math.round(minE)}–${Math.round(maxE)} m · red = steep climb, blue = descent`;
  }

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "11px Figtree, sans-serif";
  ctx.fillText(`${Math.round(maxE)} m`, 4, pad.t + 8);
  ctx.fillText(`${Math.round(minE)} m`, 4, pad.t + h);
  ctx.fillText("0 km", pad.l, cssH - 8);
  ctx.fillText(`${maxKm.toFixed(0)} km`, pad.l + w - 28, cssH - 8);

  state.elevation._chart = { pad, w, h, minE, span, maxKm, cssW, cssH };
}

function wireElevHover(route) {
  const canvas = $("#elev-canvas");
  canvas.onmousemove = (ev) => {
    const chart = state.elevation._chart;
    if (!chart) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const rel = (x - chart.pad.l) / chart.w;
    if (rel < 0 || rel > 1) return;
    const km = rel * chart.maxKm;
    let idx = 0;
    for (let i = 0; i < route.cumKm.length; i++) {
      if (route.cumKm[i] <= km) idx = i;
      else break;
    }
    drawElevChart(route, idx);
    const p = route.points[idx];
    if (!state.elevation.hoverMarker) {
      state.elevation.hoverMarker = L.circleMarker([p.lat, p.lon], {
        radius: 7,
        color: "#ffb020",
        weight: 2,
        fillColor: "#fff",
        fillOpacity: 1,
      }).addTo(state.elevation.map);
    } else {
      state.elevation.hoverMarker.setLatLng([p.lat, p.lon]);
    }
  };
}

/* ---------- C. Cartoon poster ---------- */

function projectRoute(route, width, height, margin) {
  const lats = route.points.map((p) => p.lat);
  const lons = route.points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLon = Math.max(maxLon - minLon, 0.01);
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const scale = Math.min(innerW / spanLon, innerH / spanLat) * 0.92;
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  return route.points.map((p) => {
    const x = width / 2 + (p.lon - cx) * scale;
    const y = height / 2 - (p.lat - cy) * scale;
    return { x, y, ...p };
  });
}

function simplify(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function pathFromProjected(pts) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function midPointAndAngle(pts) {
  if (!pts.length) return { x: 0, y: 0, angle: 0 };
  const mid = pts[Math.floor(pts.length / 2)];
  const a = pts[Math.max(0, Math.floor(pts.length / 2) - 2)];
  const b = pts[Math.min(pts.length - 1, Math.floor(pts.length / 2) + 2)];
  let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  return { x: mid.x, y: mid.y, angle };
}

function selectCartoonStop(route, index) {
  state.cartoon.selected = index;
  state.cartoon.roadId = null;
  renderCartoon(route);
  renderCartoonStory(route, index);
}

function highlightCartoonRoad(route, roadId) {
  const same = state.cartoon.highlightedRoad === roadId;
  state.cartoon.highlightedRoad = same ? null : roadId;
  // selecting a road (map or list) opens its panel on the right
  state.cartoon.roadId = same ? null : roadId;
  if (state.cartoon.roadId) state.cartoon.selected = null;
  renderCartoon(route);
  renderCartoonPanel(route);
}

/* The right-hand panel shows whichever thing was last picked: a road, a stop,
   or the default stop list. */
function renderCartoonPanel(route) {
  const roadIndex = (route.roads || []).findIndex((r) => r.id === state.cartoon.roadId);
  if (roadIndex >= 0) {
    renderCartoonRoadStory(route, roadIndex);
    return;
  }
  renderCartoonStory(route, state.cartoon.selected);
}

/* Clear road + stop selection and show the default all-stops panel. */
function clearCartoonSelection(route) {
  if (state.cartoon.roadId == null && state.cartoon.selected == null && !state.cartoon.highlightedRoad) return;
  state.cartoon.roadId = null;
  state.cartoon.highlightedRoad = null;
  state.cartoon.selected = null;
  renderCartoon(route);
  renderCartoonPanel(route);
  setActiveAnn($("#list-cartoon"), -1);
}

function renderCartoonRoadStory(route, ri) {
  const rd = route.roads[ri];
  const empty = $("#cartoon-story-empty");
  const detail = $("#cartoon-story-detail");
  if (!rd) return;

  const color = ROAD_PALETTE[ri % ROAD_PALETTE.length];
  const pts = route.points.slice(rd.fromIndex, rd.toIndex + 1);
  const minE = pts.length ? Math.min(...pts.map((p) => p.ele)) : 0;
  const maxE = pts.length ? Math.max(...pts.map((p) => p.ele)) : 0;
  const climb = pts.reduce((sum, p, i) => (i && p.ele > pts[i - 1].ele ? sum + p.ele - pts[i - 1].ele : sum), 0);
  const kmFrom = route.cumKm[rd.fromIndex] ?? 0;
  const kmTo = route.cumKm[rd.toIndex] ?? route.distanceKm;

  const stops = (route.annotations || [])
    .map((ann, i) => ({ ann, i }))
    .filter(({ ann }) => ann.index >= rd.fromIndex && ann.index <= rd.toIndex);

  const stopItems = stops.length
    ? stops
        .map(
          ({ ann, i }) => `<li>
            <button type="button" class="road-stop-btn" data-stop="${i}">
              ${iconHtml(ann.type)}
              <span>
                <strong>${escapeHtml(ann.title)}</strong>
                <span>${escapeHtml(ann.note)}</span>
              </span>
            </button>
          </li>`
        )
        .join("")
    : `<li class="road-stop-empty">No story pins on this stretch — it’s a link road.</li>`;

  // Leaving: prefer a turn that names the next road, else the handover turn at the
  // end of the last stop on this road.
  const nextRd = route.roads[ri + 1];
  const stopAnns = stops.map(({ ann }) => ann);
  const byName = nextRd
    ? stopAnns
        .flatMap((ann) => ann.turns || [])
        .find(
          (t) =>
            t.onto &&
            nextRd &&
            (t.onto.includes(nextRd.name) || nextRd.name.includes(t.onto.split(" ")[0]))
        )
    : null;
  const lastStopTurns = nextRd ? stopAnns[stopAnns.length - 1]?.turns || [] : [];
  const exitTurn = byName || lastStopTurns[lastStopTurns.length - 1] || lastStopTurns[0];

  empty.hidden = true;
  detail.hidden = false;
  const panel = detail.closest(".side") || detail.parentElement;
  if (panel) panel.scrollTop = 0;
  detail.innerHTML = `
    <button type="button" class="story-back" id="cartoon-road-back">← All roads &amp; stops</button>
    <p class="story-kicker story-kicker--with-icon"><span class="road-swatch" style="background:${color}"></span>Road ${ri + 1} of ${route.roads.length} · ${Number(rd.km).toFixed(1)} km</p>
    <h2>${escapeHtml(rd.name)}</h2>
    <p class="story-sub">${escapeHtml(rd.label)}</p>
    <p class="story-body">${escapeHtml(rd.story || rd.character)}</p>
    <ul class="road-stats">
      <li><span>Km ${kmFrom.toFixed(1)}–${kmTo.toFixed(1)}</span></li>
      <li><span>${Math.round(minE)}–${Math.round(maxE)} m</span></li>
      <li><span>${Math.round(climb)} m climb</span></li>
      <li><span>${stops.length} stop${stops.length === 1 ? "" : "s"}</span></li>
    </ul>
    <p class="story-section-title">Stops on ${escapeHtml(rd.name)}</p>
    <ul class="road-stop-list">${stopItems}</ul>
    <p class="story-section-title">Leaving ${escapeHtml(rd.name)}</p>
    <ul class="turn-list">
      ${
        exitTurn
          ? `<li class="turn-item">
              <div class="turn-dir" aria-hidden="true">${TURN_ARROW[exitTurn.dir] || "•"}</div>
              <div>
                <strong>${escapeHtml(exitTurn.dirLabel || exitTurn.dir)} onto ${escapeHtml(exitTurn.onto)}</strong>
                <span>At ${escapeHtml(exitTurn.at)}</span>
                <span>${escapeHtml(exitTurn.note)}</span>
              </div>
            </li>`
          : `<li class="turn-item"><div class="turn-dir">🏁</div><div><strong>${escapeHtml(rd.name)} is the last leg</strong><span>Ride it out to the finish.</span></div></li>`
      }
    </ul>
  `;

  $("#cartoon-road-back")?.addEventListener("click", () => clearCartoonSelection(route));

  $$(".road-stop-btn", detail).forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.stop);
      selectCartoonStop(route, i);
      setActiveAnn($("#list-cartoon"), i);
    });
  });
}

function renderCartoonStory(route, index) {
  const empty = $("#cartoon-story-empty");
  const detail = $("#cartoon-story-detail");
  if (index == null || index < 0) {
    empty.hidden = false;
    detail.hidden = true;
    detail.innerHTML = "";
    return;
  }
  const ann = route.annotations[index];
  if (!ann) return;
  const meta = TYPE_META[ann.type] || TYPE_META.sight;
  empty.hidden = true;
  detail.hidden = false;

  const roads = (ann.keyRoads || [])
    .map((name) => {
      const match = (route.roads || []).find(
        (r) => name.includes(r.name) || r.label.includes(name) || name.includes(r.label)
      );
      const ic = match ? roadIcon(match.icon, 22) : roadIcon("road", 22);
      return `<li class="road-chip road-chip--icon">${ic}<span>${escapeHtml(name)}</span></li>`;
    })
    .join("");

  const turns = (ann.turns || [])
    .map((t) => {
      const arrow = TURN_ARROW[t.dir] || "•";
      return `<li class="turn-item">
        <div class="turn-dir" aria-hidden="true">${arrow}</div>
        <div>
          <strong>${escapeHtml(t.dirLabel || t.dir)} onto ${escapeHtml(t.onto)}</strong>
          <span>At ${escapeHtml(t.at)}</span>
          <span>${escapeHtml(t.note)}</span>
        </div>
      </li>`;
    })
    .join("");

  detail.innerHTML = `
    <button type="button" class="story-back" id="cartoon-story-back">← All stops</button>
    <p class="story-kicker story-kicker--with-icon">${stopIcon(ann.type, 28)} <span>${escapeHtml(meta.label)} · stop ${index + 1} of ${route.annotations.length}</span></p>
    <h2>${escapeHtml(ann.title)}</h2>
    <p class="story-body">${escapeHtml(ann.story || ann.note)}</p>
    <p class="story-section-title">Key roads from here</p>
    <ul class="road-chips">${roads || "<li class='road-chip'>Follow the marked ribbon</li>"}</ul>
    <p class="story-section-title">Turn guide</p>
    <ul class="turn-list">${turns || "<li class='turn-item'><div class='turn-dir'>↑</div><div><strong>Stay on the ribbon</strong><span>No special junction at this pin.</span></div></li>"}</ul>
  `;

  $("#cartoon-story-back")?.addEventListener("click", () => clearCartoonSelection(route));
}

function renderCartoonRoadList(route) {
  const list = $("#cartoon-road-list");
  list.innerHTML = "";
  (route.roads || []).forEach((rd, ri) => {
    const color = ROAD_PALETTE[ri % ROAD_PALETTE.length];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "road-list-item" + (state.cartoon.highlightedRoad === rd.id ? " is-active" : "");
    btn.dataset.road = rd.id;
    btn.innerHTML = `
      <span class="road-list-icon" aria-hidden="true">${roadIcon(rd.icon, 40)}</span>
      <span>
        <strong><span class="road-swatch" style="background:${color}"></span>${escapeHtml(rd.name)}</strong>
        <span class="road-meta">${escapeHtml(rd.character)}</span>
      </span>
      <span class="road-list-km">${Number(rd.km).toFixed(1)} km</span>
    `;
    btn.addEventListener("click", () => highlightCartoonRoad(route, rd.id));
    list.appendChild(btn);
  });
}

function renderCartoon(route) {
  const svg = $("#cartoon-svg");
  const W = 960;
  const H = 560;
  const projected = projectRoute(route, W, H, 55);
  const step = Math.max(1, Math.floor(projected.length / 100));
  const roads = route.roads || [];
  const hi = state.cartoon.highlightedRoad;

  const hills = Array.from({ length: 7 }, (_, i) => {
    const x = 80 + i * 130;
    const h = 40 + ((i * 37) % 50);
    return `<ellipse cx="${x}" cy="${H - 30}" rx="${70 + (i % 3) * 12}" ry="${h}" fill="${i % 2 ? "#b7e4c7" : "#95d5b2"}" opacity="0.45"/>`;
  }).join("");

  const clouds = `
    <g opacity="0.4" fill="#fff" pointer-events="none">
      <ellipse cx="140" cy="70" rx="48" ry="22"/>
      <ellipse cx="175" cy="62" rx="28" ry="18"/>
      <ellipse cx="720" cy="90" rx="55" ry="24"/>
      <ellipse cx="760" cy="82" rx="30" ry="16"/>
    </g>`;

  const roadLayers = roads
    .map((rd, ri) => {
      const color = ROAD_PALETTE[ri % ROAD_PALETTE.length];
      const slice = simplify(projected.slice(rd.fromIndex, rd.toIndex + 1), step);
      if (slice.length < 2) return "";
      const d = pathFromProjected(slice);
      const { x, y, angle } = midPointAndAngle(slice);
      const active = !hi || hi === rd.id;
      const selected = hi === rd.id;
      const asphalt = selected ? 26 : 18;
      const body = selected ? 20 : 14;
      const opacity = active ? 1 : 0.22;
      const label = rd.name;
      const lw = Math.max(70, label.length * 10 + 44);
      const iconBadge = roadIconSvgBadge(rd.icon || "road", -lw / 2 + 18, 0, 0.72);
      return `
        <g class="road-seg" data-road="${escapeXml(rd.id)}" opacity="${opacity}" style="cursor:pointer">
          <path class="road-hit" d="${d}" fill="none" stroke="transparent" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="${asphalt}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="${color}" stroke-width="${body}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#fff" stroke-width="${selected ? 3.5 : 2.5}" stroke-linecap="round" stroke-dasharray="12 14" opacity="0.95"/>
          <g class="road-label" data-road="${escapeXml(rd.id)}" transform="translate(${x}, ${y}) rotate(${angle.toFixed(1)})" style="cursor:pointer">
            <rect x="${(-lw / 2).toFixed(1)}" y="-18" width="${lw}" height="36" rx="10" fill="#fff" stroke="${selected ? "#e8940a" : "#152028"}" stroke-width="${selected ? 3.5 : 2.5}"/>
            ${iconBadge}
            <text text-anchor="start" x="${(-lw / 2 + 36).toFixed(1)}" y="6" font-family="Bricolage Grotesque, sans-serif" font-size="14" font-weight="800" fill="#152028">${escapeXml(label)}</text>
          </g>
        </g>`;
    })
    .join("");

  const junctions = roads
    .slice(0, -1)
    .map((rd) => {
      const pt = projected[rd.toIndex];
      if (!pt) return "";
      return `<circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#ffd166" stroke="#152028" stroke-width="2.5" pointer-events="none"/>`;
    })
    .join("");

  const callouts = route.annotations
    .map((ann, i) => {
      const pt = projected[ann.index];
      const meta = TYPE_META[ann.type] || TYPE_META.sight;
      const selected = state.cartoon.selected === i;
      const r = selected ? 22 : 18;
      return `
        <g class="callout" data-i="${i}" style="cursor:pointer">
          <circle cx="${pt.x}" cy="${pt.y}" r="30" fill="transparent"/>
          <circle cx="${pt.x}" cy="${pt.y}" r="${r + 4}" fill="${selected ? "#ffb02066" : "#ffffffcc"}" stroke="${selected ? "#e8940a" : meta.color}" stroke-width="${selected ? 4 : 3}"/>
          ${stopIconSvgGroup(ann.type, pt.x, pt.y, selected ? 1.05 : 0.92)}
          <title>${escapeXml(ann.title)} — open story panel</title>
        </g>`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.16"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="transparent"/>
    ${hills}
    ${clouds}
    <text x="40" y="42" font-family="Bricolage Grotesque, sans-serif" font-size="26" font-weight="800" fill="#1f6b4a" pointer-events="none">Rocky Road</text>
    <text x="40" y="68" font-family="Bricolage Grotesque, sans-serif" font-size="18" font-weight="700" fill="#152028" pointer-events="none">${escapeXml(route.title)}</text>
    <text x="40" y="90" font-family="Figtree, sans-serif" font-size="12" fill="#3a4a56" pointer-events="none">${escapeXml(route.region)} · ${route.distanceKm} km</text>
    <g filter="url(#soft)">${roadLayers}</g>
    ${junctions}
    <g id="cartoon-callouts">${callouts}</g>
  `;

  // Road click → highlight + open panel. The handler sits on the whole <g> so it
  // catches clicks on any part of the road: the wide invisible hit path, the
  // visible asphalt/centre-line strokes, or the name label.
  $$(".road-seg", svg).forEach((g) => {
    const id = g.dataset.road;
    g.addEventListener("click", (ev) => {
      ev.stopPropagation();
      highlightCartoonRoad(route, id);
    });
  });

  // Pin click → story panel (must win over roads)
  $$(".callout", svg).forEach((g) => {
    g.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const i = Number(g.dataset.i);
      selectCartoonStop(route, i);
      setActiveAnn($("#list-cartoon"), i);
    });
  });

  // Background click → clear selection, back to the all-stops view.
  // Assigned (not addEventListener) so re-renders don't stack handlers on the
  // same persistent <svg> element.
  svg.onclick = (ev) => {
    if (ev.target.closest(".road-seg, .callout")) return;
    clearCartoonSelection(route);
  };

  renderCartoonRoadList(route);

  const list = $("#list-cartoon");
  fillAnnList(list, route, (ann, i) => {
    selectCartoonStop(route, i);
    setActiveAnn(list, i);
  });
  if (state.cartoon.selected != null) {
    setActiveAnn(list, state.cartoon.selected);
  } else {
    setActiveAnn(list, -1);
  }
  renderCartoonPanel(route);
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------- D. Fly-along ---------- */

function renderFlyalong(route, forceFit) {
  const el = $("#map-flyalong");
  if (!state.flyalong.map) {
    state.flyalong.map = L.map(el, { zoomControl: true });
    tileLayer().addTo(state.flyalong.map);
  }

  if (state.flyalong.layer) state.flyalong.map.removeLayer(state.flyalong.layer);
  state.flyalong.markers.forEach((m) => state.flyalong.map.removeLayer(m));
  state.flyalong.markers = [];
  if (state.flyalong.bike) {
    state.flyalong.map.removeLayer(state.flyalong.bike);
    state.flyalong.bike = null;
  }

  state.flyalong.index = 0;
  state.flyalong.revealed = new Set();
  const ll = latLngs(route);
  const trail = L.polyline(ll, { color: "#24303a", weight: 4, opacity: 0.25 });
  const done = L.polyline([ll[0]], { color: "#e85d04", weight: 6, opacity: 0.95 });
  state.flyalong.layer = L.layerGroup([trail, done]).addTo(state.flyalong.map);
  state.flyalong.doneLine = done;

  state.flyalong.bike = L.marker(ll[0], { icon: bikeIcon(), zIndexOffset: 500 }).addTo(state.flyalong.map);

  // markers start dim; brighten when revealed
  route.annotations.forEach((ann, i) => {
    const m = L.marker([ann.lat, ann.lon], {
      icon: markerIcon(ann.type),
      opacity: 0.25,
    }).addTo(state.flyalong.map);
    m.bindPopup(popupHtml(ann));
    state.flyalong.markers.push(m);
  });

  const list = $("#list-flyalong");
  fillAnnList(list, route, (ann, i) => {
    setFlyProgress(route, ann.index);
    setActiveAnn(list, i);
    showFlyNow(ann);
  });

  $("#fly-scrub").value = "0";
  $("#fly-km").textContent = "0.0 km";
  $("#fly-now").innerHTML = `<p class="now-empty">Hit play — sights pop as you ride past.</p>`;
  $("#fly-play").textContent = "Play";
  $("#fly-play").classList.remove("is-playing");

  requestAnimationFrame(() => {
    state.flyalong.map.invalidateSize();
    if (forceFit || state.flyalong._fittedFor !== route.id) {
      state.flyalong.map.fitBounds(L.latLngBounds(ll).pad(0.2));
      state.flyalong._fittedFor = route.id;
    }
  });
}

function setFlyProgress(route, index) {
  const i = Math.max(0, Math.min(index, route.points.length - 1));
  state.flyalong.index = i;
  const p = route.points[i];
  const ll = latLngs(route).slice(0, i + 1);
  state.flyalong.doneLine.setLatLngs(ll.length > 1 ? ll : [ll[0], ll[0]]);
  state.flyalong.bike.setLatLng([p.lat, p.lon]);
  state.flyalong.map.panTo([p.lat, p.lon], { animate: true, duration: 0.2 });
  if (state.flyalong.map.getZoom() < 12) state.flyalong.map.setZoom(13);

  const scrub = Math.round((i / (route.points.length - 1)) * 1000);
  $("#fly-scrub").value = String(scrub);
  $("#fly-km").textContent = `${route.cumKm[i].toFixed(1)} km`;

  // reveal annotations passed
  route.annotations.forEach((ann, ai) => {
    if (ann.index <= i && !state.flyalong.revealed.has(ai)) {
      state.flyalong.revealed.add(ai);
      state.flyalong.markers[ai].setOpacity(1);
      state.flyalong.markers[ai].openPopup();
      showFlyNow(ann);
      setActiveAnn($("#list-flyalong"), ai);
    } else if (ann.index <= i) {
      state.flyalong.markers[ai].setOpacity(1);
    }
  });
}

function showFlyNow(ann) {
  const meta = TYPE_META[ann.type] || TYPE_META.sight;
  $("#fly-now").innerHTML = `
    <div style="display:flex;gap:.55rem;align-items:flex-start">
      ${iconHtml(ann.type)}
      <div>
        <h3>${escapeHtml(ann.title)}</h3>
        <p>${escapeHtml(ann.note)}</p>
        <p style="margin-top:.35rem;font-size:.75rem;opacity:.7">${meta.label}</p>
      </div>
    </div>`;
}

function stopFly() {
  state.flyalong.playing = false;
  if (state.flyalong.raf) cancelAnimationFrame(state.flyalong.raf);
  state.flyalong.raf = null;
  const btn = $("#fly-play");
  if (btn) {
    btn.textContent = "Play";
    btn.classList.remove("is-playing");
  }
}

function toggleFly() {
  const route = currentRoute();
  if (state.flyalong.playing) {
    stopFly();
    return;
  }
  state.flyalong.playing = true;
  $("#fly-play").textContent = "Pause";
  $("#fly-play").classList.add("is-playing");

  let last = performance.now();
  const speed = Math.max(1, Math.floor(route.points.length / 18)); // ~18s full ride

  const tick = (now) => {
    if (!state.flyalong.playing) return;
    if (now - last > 32) {
      last = now;
      const next = state.flyalong.index + speed;
      if (next >= route.points.length - 1) {
        setFlyProgress(route, route.points.length - 1);
        stopFly();
        return;
      }
      setFlyProgress(route, next);
    }
    state.flyalong.raf = requestAnimationFrame(tick);
  };
  state.flyalong.raf = requestAnimationFrame(tick);
}

function setupFlyControls() {
  $("#fly-play").addEventListener("click", toggleFly);
  $("#fly-scrub").addEventListener("input", (e) => {
    const route = currentRoute();
    const t = Number(e.target.value) / 1000;
    const idx = Math.round(t * (route.points.length - 1));
    // re-evaluate reveals when scrubbing backward lightly
    if (idx < state.flyalong.index) {
      state.flyalong.revealed = new Set();
      state.flyalong.markers.forEach((m) => m.setOpacity(0.25));
    }
    setFlyProgress(route, idx);
  });
}

/* ---------- Boot ---------- */

async function boot() {
  const res = await fetch("data/routes.json");
  const data = await res.json();
  state.routes = data.routes;
  state.routeId = state.routes[0].id;

  renderRouteButtons();
  setupTabs();
  setupFlyControls();
  setupGpxUpload();
  window.addEventListener("resize", () => {
    if (state.tab === "elevation") drawElevChart(currentRoute(), null);
    if (state.tab === "cartoon") renderCartoon(currentRoute());
    ["story", "elevation", "flyalong"].forEach((k) => {
      if (state[k]?.map) state[k].map.invalidateSize();
    });
  });

  refreshActiveTab(true);
}

boot().catch((err) => {
  console.error(err);
  document.querySelector(".stage").innerHTML =
    `<p style="padding:2rem">Could not load <code>data/routes.json</code>. Serve this folder over HTTP (not file://).</p>`;
});
