const DEFS = [
  {
    name: 'Willis Tower',
    lat: 41.8789, lon: -87.6359,
    fact: 'World\'s tallest building 1973–1998. 443 m (1,451 ft), 110 floors of bundled steel tubes designed by Fazlur Khan.',
  },
  {
    name: 'Cloud Gate  ·  "The Bean"',
    lat: 41.8827, lon: -87.6233,
    fact: 'Anish Kapoor\'s 110-ton mirror-polished sculpture reflects the skyline and every visitor. Officially completed 2006.',
  },
  {
    name: 'Tribune Tower',
    lat: 41.8908, lon: -87.6271,
    fact: 'Neo-Gothic skyscraper (1925). Its base is studded with stones from 149 famous world landmarks — Notre Dame, the Colosseum, the Taj Mahal.',
  },
  {
    name: 'Chicago Board of Trade',
    lat: 41.8780, lon: -87.6335,
    fact: 'World\'s oldest futures exchange, founded 1848. The Art Deco tower is topped by a 6-m aluminium statue of Ceres, goddess of grain.',
  },
  {
    name: 'Marina City',
    lat: 41.8851, lon: -87.6290,
    fact: '"Corncob" towers (1964) — the first mixed-use skyscrapers in the US, with 900 apartments, parking, restaurants and a marina on the river.',
  },
  {
    name: 'Wrigley Building',
    lat: 41.8893, lon: -87.6268,
    fact: 'Gleaming white terra-cotta landmark (1924). Built for the Wrigley chewing-gum empire and illuminated dramatically every night.',
  },
  {
    name: 'Millennium Park',
    lat: 41.8826, lon: -87.6233,
    fact: 'A 24.5-acre public park opened 2004, built over a rail yard. Home to Cloud Gate, Crown Fountain and the Jay Pritzker Pavilion.',
  },
  {
    name: 'John Hancock Center',
    lat: 41.8990, lon: -87.6230,
    fact: '100-story X-braced tower (1969). The diagonal steel cross-bracing — visible on the façade — replaced interior columns, freeing the floor plan.',
  },
  {
    name: 'Chicago Riverwalk',
    lat: 41.8869, lon: -87.6255,
    fact: '1.25-mile pedestrian esplanade along the Chicago River, opened 2015. Lined with restaurants, kayak docks and rotating public art installations.',
  },
];

const TRIGGER_DIST = 80; // metres

export function createLandmarks(project) {
  const items = DEFS.map(d => ({ ...d, wp: project(d.lat, d.lon) }));

  const card   = document.createElement('div');
  card.id      = 'landmark-card';
  const nameEl = document.createElement('div');
  nameEl.id    = 'landmark-name';
  const factEl = document.createElement('div');
  factEl.id    = 'landmark-fact';
  card.append(nameEl, factEl);
  document.body.appendChild(card);

  let active = null;

  return {
    update(pos) {
      let nearest = null, nearDist = TRIGGER_DIST;
      for (const lm of items) {
        const dx = pos.x - lm.wp.x, dz = pos.z - lm.wp.z;
        const d  = Math.sqrt(dx * dx + dz * dz);
        if (d < nearDist) { nearDist = d; nearest = lm; }
      }

      if (nearest !== active) {
        active = nearest;
        if (nearest) {
          nameEl.textContent = nearest.name;
          factEl.textContent = nearest.fact;
          card.classList.add('visible');
        } else {
          card.classList.remove('visible');
        }
      }
    },
  };
}
