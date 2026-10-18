/** Parse a GPX file into the concept lab route shape. */

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function textOf(el, localName) {
  if (!el) return "";
  const kids = [...el.children].filter((c) => c.localName === localName);
  return kids[0]?.textContent?.trim() || "";
}

function readPoints(doc) {
  const trkpts = [...doc.getElementsByTagNameNS("*", "trkpt")];
  const source = trkpts.length
    ? trkpts
    : [...doc.getElementsByTagNameNS("*", "rtept")];

  return source
    .map((pt) => {
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const eleRaw = textOf(pt, "ele");
      const elev = eleRaw === "" ? 0 : parseFloat(eleRaw);
      return {
        lat,
        lon,
        elev: Number.isFinite(elev) ? elev : 0,
      };
    })
    .filter(Boolean);
}

function titleFromDoc(doc, fileName) {
  const meta = doc.getElementsByTagNameNS("*", "metadata")[0];
  const metaName = textOf(meta, "name");
  if (metaName) return metaName;
  const trk = doc.getElementsByTagNameNS("*", "trk")[0];
  const trkName = textOf(trk, "name");
  if (trkName) return trkName;
  const rte = doc.getElementsByTagNameNS("*", "rte")[0];
  const rteName = textOf(rte, "name");
  if (rteName) return rteName;
  return (fileName || "Uploaded ride").replace(/\.gpx$/i, "");
}

function pointAtFraction(points, t) {
  const i = Math.min(
    points.length - 1,
    Math.max(0, Math.round(t * (points.length - 1)))
  );
  return { index: i, point: points[i] };
}

/**
 * @param {string} text - GPX XML
 * @param {string} [fileName]
 * @returns {object} route compatible with routes.json entries
 */
export function parseGpx(text, fileName = "upload.gpx") {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    throw new Error("That file is empty.");
  }

  const doc = new DOMParser().parseFromString(trimmed, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Could not parse that file as GPX XML.");
  }

  const points = readPoints(doc);
  if (points.length < 2) {
    throw new Error("No usable track found (need at least two points).");
  }

  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }
  distanceKm = Math.round(distanceKm * 10) / 10;

  const elevs = points.map((p) => p.elev);
  const elevMin = Math.min(...elevs);
  const elevMax = Math.max(...elevs);

  const start = points[0];
  const end = points[points.length - 1];
  const midA = pointAtFraction(points, 1 / 3);
  const midB = pointAtFraction(points, 2 / 3);

  const annotations = [
    {
      type: "start",
      title: "Start",
      note: "Where this uploaded ride begins.",
      lat: start.lat,
      lon: start.lon,
      index: 0,
      t: 0,
    },
    {
      type: "twisty",
      title: "Along the way",
      note: "Auto marker at about one-third of the track.",
      lat: midA.point.lat,
      lon: midA.point.lon,
      index: midA.index,
      t: 1 / 3,
    },
    {
      type: "sight",
      title: "Lookout stretch",
      note: "Auto marker at about two-thirds of the track.",
      lat: midB.point.lat,
      lon: midB.point.lon,
      index: midB.index,
      t: 2 / 3,
    },
    {
      type: "hotel",
      title: "End",
      note: "Where this uploaded ride finishes.",
      lat: end.lat,
      lon: end.lon,
      index: points.length - 1,
      t: 1,
    },
  ];

  const half = Math.floor((points.length - 1) / 2);
  const roads = [
    {
      id: "leg-a",
      name: "First half",
      label: "Opening miles",
      character: "Uploaded track",
      fromT: 0,
      toT: 0.5,
      fromIndex: 0,
      toIndex: half,
      km: Math.round(distanceKm * 5) / 10,
      icon: "road",
    },
    {
      id: "leg-b",
      name: "Second half",
      label: "Home stretch",
      character: "Uploaded track",
      fromT: 0.5,
      toT: 1,
      fromIndex: half,
      toIndex: points.length - 1,
      km: Math.round(distanceKm * 5) / 10,
      icon: "scenic",
    },
  ];

  const id = `upload-${Date.now()}`;
  const title = titleFromDoc(doc, fileName);

  return {
    id,
    title,
    region: "Uploaded",
    blurb: `GPX import from ${fileName || "your file"}.`,
    gpx: fileName || "",
    distanceKm,
    elevMin: Math.round(elevMin * 10) / 10,
    elevMax: Math.round(elevMax * 10) / 10,
    points,
    annotations,
    roads,
  };
}
