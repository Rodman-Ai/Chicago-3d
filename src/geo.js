const R = 6378137.0; // WGS84 equatorial radius in meters

function mercator(lat, lon) {
  const x = R * (lon * Math.PI / 180);
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return { x, y };
}

// Returns a projection function centered on (centerLat, centerLon).
// project(lat, lon) -> { x, z } in Three.js world space (1 unit = 1 meter).
// East is +X, north is -Z (Three.js default camera faces -Z).
export function createProjection(centerLat, centerLon) {
  const origin = mercator(centerLat, centerLon);
  return function project(lat, lon) {
    const m = mercator(lat, lon);
    return {
      x: m.x - origin.x,
      z: -(m.y - origin.y),
    };
  };
}
