import { DEFAULT_LEVELS, METERS_PER_LEVEL, OVERPASS_URL } from './config.js';

export async function fetchBuildings(bbox, onProgress) {
  const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
);
out body;
>;
out skel qt;`;

  onProgress('Connecting to OpenStreetMap...', 0.05);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}. Try refreshing.`);
  }

  onProgress('Downloading building data...', 0.2);

  const json = await response.json();

  onProgress('Parsing buildings...', 0.45);

  return parseOSM(json);
}

function parseOSM(json) {
  // Build node lookup: id -> { lat, lon }
  const nodeMap = new Map();
  for (const el of json.elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const buildings = [];
  for (const el of json.elements) {
    if (el.type !== 'way' || !el.tags?.building) continue;
    if (!el.nodes || el.nodes.length < 4) continue;

    const nodes = el.nodes.map(id => nodeMap.get(id)).filter(Boolean);
    // Drop duplicate closing node (OSM closed rings repeat first node at end)
    const ring = nodes.length > 1 && nodesEqual(nodes[0], nodes[nodes.length - 1])
      ? nodes.slice(0, -1)
      : nodes;

    if (ring.length < 3) continue;

    buildings.push({ nodes: ring, height: parseHeight(el.tags) });
  }

  return buildings;
}

function nodesEqual(a, b) {
  return a.lat === b.lat && a.lon === b.lon;
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
