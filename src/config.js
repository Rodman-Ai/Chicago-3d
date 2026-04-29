// Chicago Loop center
export const CENTER_LAT = 41.8781;
export const CENTER_LON = -87.6298;

// Overpass bounding box: south, west, north, east
export const OSM_BBOX = '41.870,-87.640,41.890,-87.618';
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Player movement
export const PLAYER_SPEED = 8.0;        // m/s
export const PLAYER_HEIGHT = 1.7;       // meters
export const PLAYER_EYE = 1.6;          // camera y above ground
export const PLAYER_RADIUS = 0.5;       // collision cylinder radius
export const MOUSE_SENSITIVITY = 0.002; // radians per pixel

// Camera
export const FOV = 75;
export const NEAR = 0.1;
export const FAR = 3000;

// Buildings
export const DEFAULT_LEVELS = 2;
export const METERS_PER_LEVEL = 3.5;

// Collision spatial grid
export const GRID_CELL_SIZE = 120; // meters per cell

// World
export const WORLD_SIZE = 3000; // ground plane diameter in meters
