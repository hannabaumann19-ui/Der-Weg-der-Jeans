/* ============================================
   JEANSUNSTITCHED — Kapitel 4: Die globale Reise
   D3-Route über alle Produktionsschritte hinweg,
   Linienfarbe wechselt je nach Kapitel-Bezug
   (Baumwolle/Spinnen & Weben/Nähen/Transport).

   Datenquelle: aktuell noch lokal in dieser Datei
   (transportWaypoints/transportSegments) — später
   analog zu den anderen Kapiteln aus der Supabase-
   Tabelle "transport_steps" zu befüllen.
   ============================================ */

'use strict';

(function () {
  const container = document.getElementById('transport-map-container');
  if (!container || typeof d3 === 'undefined') return;

  // ------------------------------------------
  // DATEN: Wegpunkte & Segmente
  // ------------------------------------------
  const transportWaypoints = [
    { id: 'tashkent',     name: 'Usbekistan', sub: 'Baumwollernte',   coords: [69.28, 41.30] },
    { id: 'karachi',      name: 'Pakistan',    sub: 'Spinnen',        coords: [67.00, 24.86] },
    { id: 'shanghai',     name: 'China',       sub: 'Weben',          coords: [121.47, 31.23] },
    { id: 'chittagong1',  name: 'Chittagong',  sub: 'Ankunft Stoff',  coords: [91.83, 22.34] },
    { id: 'dhaka',        name: 'Dhaka',       sub: 'Nähen',          coords: [90.41, 23.81] },
    { id: 'chittagong2',  name: 'Chittagong',  sub: 'Verschiffung',   coords: [91.83, 22.34] },
    { id: 'colombo',      name: 'Colombo',     sub: 'Umschlag',       coords: [79.85, 6.93] },
    { id: 'suez',         name: 'Suezkanal',   sub: 'Durchfahrt',     coords: [32.28, 31.26] },
    { id: 'hamburg',      name: 'Hamburg',     sub: 'Hafen & Zoll',   coords: [9.99, 53.55] },
    { id: 'wuerzburg',    name: 'Würzburg',    sub: 'Ziel',           coords: [9.93, 49.79] }
  ];

  // cat: cotton | spinweb | sewing | transport (bestimmt Linienfarbe)
  const transportSegments = [
    { from: 'tashkent', to: 'karachi', cat: 'spinweb', mode: '🚛', km: 1850,
      info: '<strong>Usbekistan → Pakistan (Karatschi):</strong> Die Rohbaumwolle reist per LKW/Bahn zum Verspinnen — ca. 1.850 km.' },
    { from: 'karachi', to: 'shanghai', cat: 'spinweb', mode: '🚢', km: 5350,
      info: '<strong>Pakistan → China (Shanghai-Region):</strong> Das gesponnene und gefärbte Garn wird zum Weben nach China verschifft — ca. 5.350 km.' },
    { from: 'shanghai', to: 'chittagong1', cat: 'sewing', mode: '🚢', km: 3900,
      info: '<strong>China → Chittagong, Bangladesch:</strong> Der fertige Denim-Stoff wird zum Nähen nach Bangladesch verschifft — ca. 3.900 km.' },
    { from: 'chittagong1', to: 'dhaka', cat: 'sewing', mode: '🚛', km: 220,
      info: '<strong>Chittagong → Dhaka:</strong> Chittagong ist Bangladeschs Haupthafen, aber kein Nähstandort — der Stoff reist per LKW weiter zu den Nähfabriken in Dhaka. ~220 km.' },
    { from: 'dhaka', to: 'chittagong2', cat: 'transport', mode: '🚛', km: 220,
      info: '<strong>Dhaka → Chittagong:</strong> Die fertige Jeans reist zurück zum Hafen, um verschifft zu werden — ~220 km.' },
    { from: 'chittagong2', to: 'colombo', cat: 'transport', mode: '🚢', km: 2200,
      info: '<strong>Chittagong → Colombo:</strong> Erste Etappe der Überseereise, Umschlag im Hafen von Colombo — ca. 2.200 km.' },
    { from: 'colombo', to: 'suez', cat: 'transport', mode: '🚢', km: 6100,
      info: '<strong>Colombo → Suezkanal:</strong> Durch den Indischen Ozean und das Rote Meer — ca. 6.100 km.' },
    { from: 'suez', to: 'hamburg', cat: 'transport', mode: '🚢', km: 5500,
      info: '<strong>Suezkanal → Hamburg:</strong> Durchs Mittelmeer, die Straße von Gibraltar, den Atlantik und die Nordsee — ca. 5.500 km reale Seeroute.' },
    { from: 'hamburg', to: 'wuerzburg', cat: 'transport', mode: '🚛', km: 490,
      info: '<strong>Hamburg → Würzburg:</strong> Die letzte Etappe per LKW über die A7 — ca. 490 km Straßenstrecke.' }
  ];

  const TOTAL_KM = transportSegments.reduce((sum, s) => sum + s.km, 0);
  const TOTAL_KM_ROUNDED = Math.round(TOTAL_KM / 100) * 100;
  const TOTAL_KM_LABEL = '~' + TOTAL_KM_ROUNDED.toLocaleString('de-DE') + ' km';

  const CATEGORY_COLOR = {
    cotton:    'var(--sage)',
    spinweb:   'var(--navy)',
    sewing:    'var(--terracotta)',
    transport: 'var(--amber)'
  };

  function colorForWaypoint(id) {
    if (id === 'tashkent') return CATEGORY_COLOR.cotton;
    if (id === 'karachi' || id === 'shanghai') return CATEGORY_COLOR.spinweb;
    if (id.startsWith('chittagong') || id === 'dhaka') return CATEGORY_COLOR.sewing;
    return CATEGORY_COLOR.transport;
  }

  const width = 960;
  const height = 460;

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'transport-map-svg')
    .attr('class', 'map-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', 'Karte: Transportroute der Jeans von der Baumwollernte bis Würzburg');

  const projection = d3.geoNaturalEarth1();
  const geoPath = d3.geoPath(projection);

  const gLand   = svg.append('g').attr('class', 'transport-layer-land');
  const gRoutes = svg.append('g').attr('class', 'transport-layer-routes');
  const gPoints = svg.append('g').attr('class', 'transport-layer-points');
  const gShip   = svg.append('g').attr('class', 'transport-layer-ship');

  function project(id) {
    const wp = transportWaypoints.find(w => w.id === id);
    return projection(wp.coords);
  }

  function greatCircleLine(fromId, toId) {
    const a = transportWaypoints.find(w => w.id === fromId).coords;
    const b = transportWaypoints.find(w => w.id === toId).coords;
    const interpolate = d3.geoInterpolate(a, b);
    const pts = d3.range(0, 1.001, 0.02).map(t => projection(interpolate(t)));
    const lineGen = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
    return lineGen(pts);
  }

  function drawRoutes() {
    gRoutes.selectAll('path')
      .data(transportSegments)
      .join('path')
      .attr('class', d => 'transport-route-path ' + d.cat)
      .attr('id', (d, i) => 'transport-seg-' + i)
      .attr('d', d => greatCircleLine(d.from, d.to))
      .each(function () {
        const len = this.getTotalLength();
        d3.select(this)
          .attr('stroke-dasharray', len)
          .attr('stroke-dashoffset', len);
      });
  }

  function drawWaypoints() {
    // Doppelte Chittagong-Punkte (Ankunft/Verschiffung) nur einmal anzeigen
    const uniqueWaypoints = [];
    const seen = new Set();
    transportWaypoints.forEach(w => {
      const key = w.id.replace(/[12]$/, '');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueWaypoints.push(w);
      }
    });

    const g = gPoints.selectAll('g.transport-waypoint')
      .data(uniqueWaypoints)
      .join('g')
      .attr('class', 'transport-waypoint')
      .attr('transform', d => {
        const [x, y] = projection(d.coords);
        return `translate(${x},${y})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => showWaypointInfo(d));

    g.append('circle')
      .attr('class', 'transport-waypoint-pulse')
      .attr('r', 5)
      .attr('fill', d => colorForWaypoint(d.id))
      .attr('opacity', 0.5);

    g.append('circle')
      .attr('class', 'transport-waypoint-core')
      .attr('r', 5)
      .attr('fill', d => colorForWaypoint(d.id))
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('class', 'transport-waypoint-label')
      .attr('x', 8)
      .attr('y', -6)
      .text(d => d.name);

    g.append('text')
      .attr('class', 'transport-waypoint-sub')
      .attr('x', 8)
      .attr('y', 5)
      .text(d => d.sub);
  }

  function showWaypointInfo(wp) {
    const infoBox = document.getElementById('transport-map-info');
    if (!infoBox) return;
    const relatedSeg = transportSegments.find(s => s.from === wp.id || s.to === wp.id);
    infoBox.innerHTML = relatedSeg ? relatedSeg.info : `<strong>${wp.name}</strong> — ${wp.sub}`;
  }

  // ------------------------------------------
  // ANIMATION: Route abspielen + km live aufaddieren
  // ------------------------------------------
  const playBtn = document.getElementById('transport-play-btn');
  const totalKmEl = document.getElementById('transport-total-km');
  let isPlaying = false;

  function formatKm(n) {
    return n.toLocaleString('de-DE') + ' km';
  }

  function resetRoute() {
    transportSegments.forEach((seg, i) => {
      const el = document.getElementById('transport-seg-' + i);
      if (!el) return;
      const len = el.getTotalLength();
      el.style.transition = 'none';
      el.setAttribute('stroke-dashoffset', len);
    });
  }

  function moveShipAlong(pathEl, icon, duration) {
    gShip.selectAll('*').remove();
    const len = pathEl.getTotalLength();
    const shipText = gShip.append('text')
      .attr('class', 'transport-icon')
      .text(icon);

    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const pt = pathEl.getPointAtLength(t * len);
      shipText.attr('x', pt.x).attr('y', pt.y);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function playSequence(i, runningKm) {
    if (i >= transportSegments.length) {
      isPlaying = false;
      if (playBtn) {
        playBtn.disabled = false;
        playBtn.textContent = '↺ Reise neu starten';
      }
      if (totalKmEl) totalKmEl.textContent = TOTAL_KM_LABEL;
      const infoBox = document.getElementById('transport-map-info');
      if (infoBox) {
        infoBox.innerHTML = `<strong>Angekommen!</strong> Die Jeans hat ${TOTAL_KM_LABEL} zurückgelegt — von der Baumwollernte bis ins Regal.`;
      }
      return;
    }

    const seg = transportSegments[i];
    const el = document.getElementById('transport-seg-' + i);
    const len = el.getTotalLength();
    const duration = 900;

    const infoBox = document.getElementById('transport-map-info');
    if (infoBox) infoBox.innerHTML = seg.info;
    moveShipAlong(el, seg.mode, duration);

    el.style.transition = `stroke-dashoffset ${duration}ms ease`;
    requestAnimationFrame(() => el.setAttribute('stroke-dashoffset', 0));

    setTimeout(() => {
      // km erst NACH Ankunft der aktuellen Etappe aufaddieren
      const newTotal = runningKm + seg.km;
      if (totalKmEl) totalKmEl.textContent = formatKm(newTotal);
      playSequence(i + 1, newTotal);
    }, duration + 200);
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isPlaying) return;
      isPlaying = true;
      playBtn.disabled = true;
      playBtn.textContent = 'Reise läuft …';
      resetRoute();
      if (totalKmEl) totalKmEl.textContent = '0 km';
      playSequence(0, 0);
    });
  }

  // ------------------------------------------
  // Karte laden & aufbauen
  // ------------------------------------------
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(world => {
      const countries = topojson.feature(world, world.objects.countries);

      // Projektion auf sichtbaren Kartenausschnitt zuschneiden (Fokus Asien-Europa)
      projection.fitExtent([[10, 10], [width - 10, height - 10]], {
        type: 'FeatureCollection',
        features: countries.features
      });
      const [tx, ty] = projection.translate();
      projection.translate([tx, ty - 10]);

      gLand.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('class', 'transport-land')
        .attr('d', geoPath);

      drawRoutes();
      drawWaypoints();

      container.removeAttribute('data-loading');
      if (totalKmEl) totalKmEl.textContent = TOTAL_KM_LABEL;
    })
    .catch(err => {
      console.error('Transportkarte konnte nicht geladen werden:', err);
      container.innerHTML = '<p class="map-loading-text">Karte konnte nicht geladen werden. Bitte Internetverbindung prüfen.</p>';
    });
})();
