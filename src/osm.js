import { DEFAULT_LEVELS, METERS_PER_LEVEL, OVERPASS_URL } from './config.js';

const ROAD_TYPES = new Set([
  'primary', 'primary_link',
  'secondary', 'secondary_link',
  'tertiary', 'tertiary_link',
  'residential', 'unclassified',
]);

export async function fetchCityData(bbox, onProgress) {
  const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  way["highway"]["name"](${bbox});
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

  onProgress('Downloading city data...', 0.2);
  const json = await response.json();
  onProgress('Parsing data...', 0.45);

  return parseOSM(json);
}

function parseOSM(json) {
  const nodeMap = new Map();
  for (const el of json.elements) {
    if (el.type === 'node') nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
  }

  const buildings = [];
  const streets = [];

  for (const el of json.elements) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) continue;

    const nodes = el.nodes.map(id => nodeMap.get(id)).filter(Boolean);

    if (el.tags?.building) {
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

  return { buildings, streets };
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
