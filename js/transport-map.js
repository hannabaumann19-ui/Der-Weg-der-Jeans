/* ============================================
   JEANSUNSTITCHED — Kapitel 4: Die globale Reise
   D3-Route über alle Produktionsschritte hinweg,
   Linienfarbe wechselt je nach Kapitel-Bezug
   (Baumwolle/Spinnen & Weben/Nähen/Transport).

   Datenquelle: window.transportWaypointsData und
   window.transportStepsData, befüllt von js/data.js
   aus den Supabase-Tabellen "transport_waypoints"
   und "transport_steps". Diese Datei wartet auf
   window.dataReady, bevor sie zeichnet — sie enthält
   selbst keine Zahlen/Orte mehr.
   ============================================ */

'use strict';

(function () {
  const container = document.getElementById('transport-map-container');
  if (!container || typeof d3 === 'undefined') return;

  const CATEGORY_COLOR = {
    cotton:    'var(--sage)',
    spinweb:   'var(--navy)',
    sewing:    'var(--terracotta)',
    transport: 'var(--amber)'
  };

  function colorForWaypoint(wp, steps) {
    // Eigene Kategorie hat Vorrang (z.B. Taschkent = "cotton",
    // unabhängig davon, welche Kategorie die abgehende Strecke hat).
    if (wp.category && CATEGORY_COLOR[wp.category]) return CATEGORY_COLOR[wp.category];
    const outgoing = steps.find(s => s.from_id === wp.id);
    if (outgoing) return CATEGORY_COLOR[outgoing.category] || 'var(--navy)';
    const incoming = steps.find(s => s.to_id === wp.id);
    if (incoming) return CATEGORY_COLOR[incoming.category] || 'var(--navy)';
    return 'var(--navy)';
  }

  function formatKm(n) {
    return Math.round(n).toLocaleString('de-DE') + ' km';
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

  function renderMap(waypoints, steps) {
    if (!waypoints.length || !steps.length) {
      container.innerHTML = '<p class="map-loading-text">Keine Kartendaten gefunden. Sind die Tabellen "transport_waypoints" und "transport_steps" in Supabase befüllt?</p>';
      return;
    }

    const TOTAL_KM = steps.reduce((sum, s) => sum + Number(s.km), 0);
    const TOTAL_KM_ROUNDED = Math.round(TOTAL_KM / 100) * 100;
    const TOTAL_KM_LABEL = '~' + TOTAL_KM_ROUNDED.toLocaleString('de-DE') + ' km';

    const wpById = {};
    waypoints.forEach(w => { wpById[w.id] = w; });

    function coordsOf(id) {
      const w = wpById[id];
      return [Number(w.lon), Number(w.lat)];
    }

    function greatCircleLine(fromId, toId) {
      const a = coordsOf(fromId);
      const b = coordsOf(toId);
      const interpolate = d3.geoInterpolate(a, b);
      const pts = d3.range(0, 1.001, 0.02).map(t => projection(interpolate(t)));
      const lineGen = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
      return lineGen(pts);
    }

    function drawRoutes() {
      gRoutes.selectAll('path')
        .data(steps)
        .join('path')
        .attr('class', d => 'transport-route-path ' + d.category)
        .attr('id', (d, i) => 'transport-seg-' + i)
        .attr('d', d => greatCircleLine(d.from_id, d.to_id))
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          showStepInfo(d);
          highlightLegend(d.category);
        })
        .each(function () {
          const len = this.getTotalLength();
          d3.select(this)
            .attr('stroke-dasharray', len)
            .attr('stroke-dashoffset', len);
        });
    }

    function drawWaypoints() {
      const g = gPoints.selectAll('g.transport-waypoint')
        .data(waypoints)
        .join('g')
        .attr('class', 'transport-waypoint')
        .attr('transform', d => {
          const [x, y] = projection([Number(d.lon), Number(d.lat)]);
          return `translate(${x},${y})`;
        })
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => showWaypointInfo(d));

      g.append('circle')
        .attr('class', 'transport-waypoint-pulse')
        .attr('r', 5)
        .attr('fill', d => colorForWaypoint(d, steps))
        .attr('opacity', 0.5);

      g.append('circle')
        .attr('class', 'transport-waypoint-core')
        .attr('r', 5)
        .attr('fill', d => colorForWaypoint(d, steps))
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
        .text(d => d.sub || '');
    }

    function showStepInfo(seg) {
      const infoBox = document.getElementById('transport-map-info');
      if (infoBox) infoBox.innerHTML = seg.info;
    }

    function showWaypointInfo(wp) {
      const infoBox = document.getElementById('transport-map-info');
      // Eigener Info-Text hat Vorrang (z.B. Taschkent = Start der Reise,
      // gehört zu keiner der Transport-Etappen).
      if (wp.info) {
        if (infoBox) infoBox.innerHTML = wp.info;
        highlightLegend(wp.category || null);
        return;
      }
      const relatedSeg = steps.find(s => s.from_id === wp.id || s.to_id === wp.id);
      if (relatedSeg) {
        showStepInfo(relatedSeg);
        highlightLegend(wp.category || relatedSeg.category);
      } else if (infoBox) {
        infoBox.innerHTML = `<strong>${wp.name}</strong> — ${wp.sub || ''}`;
      }
    }

    function highlightLegend(category) {
      const legend = document.getElementById('transport-legend');
      if (!legend) return;
      legend.querySelectorAll('.transport-legend-item').forEach(item => {
        item.classList.toggle('active', item.dataset.legendCat === category);
      });
    }

    // ------------------------------------------
    // ANIMATION: Route abspielen + km live aufaddieren
    // ------------------------------------------
    const playBtn = document.getElementById('transport-play-btn');
    const totalKmEl = document.getElementById('transport-total-km');
    let isPlaying = false;

    function resetRoute() {
      steps.forEach((seg, i) => {
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
      if (i >= steps.length) {
        isPlaying = false;
        if (playBtn) {
          playBtn.disabled = false;
          playBtn.textContent = '↺ Reise neu starten';
        }
        if (totalKmEl) totalKmEl.textContent = TOTAL_KM_LABEL;
        highlightLegend(null);
        const infoBox = document.getElementById('transport-map-info');
        if (infoBox) {
          infoBox.innerHTML = `<strong>Angekommen!</strong> Die Jeans hat ${TOTAL_KM_LABEL} zurückgelegt — von der Baumwollernte bis ins Regal. Fahre über die Karte, um dir die einzelnen Etappen nochmal anzuschauen.`;
        }
        return;
      }

      const seg = steps[i];
      const el = document.getElementById('transport-seg-' + i);
      const len = el.getTotalLength();
      const duration = 2200;

      showStepInfo(seg);
      highlightLegend(seg.category);
      moveShipAlong(el, seg.mode, duration);

      el.style.transition = `stroke-dashoffset ${duration}ms ease`;
      requestAnimationFrame(() => el.setAttribute('stroke-dashoffset', 0));

      setTimeout(() => {
        const newTotal = runningKm + Number(seg.km);
        if (totalKmEl) totalKmEl.textContent = formatKm(newTotal);
        playSequence(i + 1, newTotal);
      }, duration + 500);
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
  }

  // Erst zeichnen, wenn data.js die Supabase-Daten geladen hat
  if (window.dataReady && typeof window.dataReady.then === 'function') {
    window.dataReady.then(() => renderMap(window.transportWaypointsData || [], window.transportStepsData || []));
  } else {
    console.warn('window.dataReady nicht gefunden — Karte wird ohne Wartezeit gerendert.');
    renderMap(window.transportWaypointsData || [], window.transportStepsData || []);
  }
})();
