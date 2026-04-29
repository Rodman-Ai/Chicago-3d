import { DEFAULT_LEVELS, METERS_PER_LEVEL, OVERPASS_URL } from './config.js';

const SKIP_BUILDING = new Set([
  'wall', 'roof', 'canopy', 'tent', 'ruins', 'no',
  'entrance', 'platform', 'bridge', 'tunnel',
]);

const ROAD_TYPES = new Set([
  'primary', 'primary_link',
  'secondary', 'secondary_link',
  'tertiary', 'tertiary_link',
  'residential', 'unclassified',
]);

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VER = 'v3';                 // bump to invalidate old caches

export async function fetchCityData(bbox, onProgress) {
  // ── localStorage cache ────────────────────────────────────────────────────
  const cacheKey = `osm:${CACHE_VER}:${bbox}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) {
        onProgress('Loading from cache…', 0.15);
        return parseOSM(data);
      }
    }
  } catch (_) { /* quota or parse error — fall through to fetch */ }

  // ── Overpass fetch ────────────────────────────────────────────────────────
  const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  relation["building"]["type"="multipolygon"](${bbox});
  way["highway"]["name"](${bbox});
);
out body;
>;
out skel qt;`;

  onProgress('Connecting to OpenStreetMap…', 0.05);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}. Try refreshing.`);
  }

  onProgress('Downloading city data…', 0.2);
  const json = await response.json();
  onProgress('Parsing data…', 0.45);

  // ── Store in cache ────────────────────────────────────────────────────────
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: json }));
  } catch (_) { /* quota exceeded — skip */ }

  return parseOSM(json);
}

function parseOSM(json) {
  const nodeMap = new Map();
  for (const el of json.elements) {
    if (el.type === 'node') nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
  }

  const wayMap = new Map();
  for (const el of json.elements) {
    if (el.type === 'way') wayMap.set(el.id, el);
  }

  const buildings = [];
  const streets   = [];

  // ── Ways: buildings + roads ───────────────────────────────────────────────
  for (const el of json.elements) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) continue;

    const nodes = el.nodes.map(id => nodeMap.get(id)).filter(Boolean);

    if (el.tags?.building) {
      if (SKIP_BUILDING.has(el.tags.building)) continue;

      const ring = nodes.length > 1 && nodesEqual(nodes[0], nodes[nodes.length - 1])
        ? nodes.slice(0, -1)
        : nodes;
      if (ring.length >= 3) {
        buildings.push({ nodes: ring, height: parseHeight(el.tags) });
      }
    } else if (el.tags?.highway && el.tags?.name && ROAD_TYPES.has(el.tags.highway)) {
      streets.push({ nodes, name: el.tags.name, highway: el.tags.highway });
    }
  }

  // ── Relations: multipolygon buildings ────────────────────────────────────
  for (const el of json.elements) {
    if (el.type !== 'relation' || !el.tags?.building) continue;

    const outerIds = (el.members ?? [])
      .filter(m => m.type === 'way' && m.role === 'outer')
      .map(m => m.ref);

    if (!outerIds.length) continue;

    const ring = assembleRing(outerIds, wayMap, nodeMap);
    if (ring && ring.length >= 3) {
      buildings.push({ nodes: ring, height: parseHeight(el.tags) });
    }
  }

  return { buildings, streets };
}

// Stitch one or more OSM ways into a single closed polygon ring.
function assembleRing(wayIds, wayMap, nodeMap) {
  const segments = wayIds
    .map(id => {
      const w = wayMap.get(id);
      if (!w) return null;
      return w.nodes.map(nid => nodeMap.get(nid)).filter(Boolean);
    })
    .filter(s => s && s.length >= 2);

  if (!segments.length) return null;

  if (segments.length === 1) {
    const s = segments[0];
    return nodesEqual(s[0], s[s.length - 1]) ? s.slice(0, -1) : s;
  }

  const ring = [...segments[0]];
  const used = new Set([0]);

  for (let iter = 0; iter < segments.length; iter++) {
    const last = ring[ring.length - 1];
    let found = false;
    for (let i = 1; i < segments.length; i++) {
      if (used.has(i)) continue;
      const seg = segments[i];
      if (nodesEqual(seg[0], last)) {
        ring.push(...seg.slice(1));
        used.add(i); found = true; break;
      }
      if (nodesEqual(seg[seg.length - 1], last)) {
        ring.push(...seg.slice(0, -1).reverse());
        used.add(i); found = true; break;
      }
    }
    if (!found) break;
  }

  if (ring.length > 1 && nodesEqual(ring[0], ring[ring.length - 1])) ring.pop();
  return ring;
}

function nodesEqual(a, b) {
  return a && b && a.lat === b.lat && a.lon === b.lon;
}

function parseHeight(tags) {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
  }
  if (tags['building:levels']) {
    const levels = parseFloat(tags['building:levels']);
    if (!isNaN(levels) && levels > 0) return levels * METERS_PER_LEVEL;
  }
  return DEFAULT_LEVELS * METERS_PER_LEVEL;
}
