/* ============================================
   JEANSUNSTICHED — Weltkarte: Baumwollanbau & Wasser
   Bubble-Map (D3.js + TopoJSON):
   - Kreisgröße  = Anteil an der Weltproduktion
   - Kreisfarbe  = Wasserintensität (3 Stufen)
   - Tooltip     = exakte Literzahl nur wo belegt,
                    sonst Kategorie + Bewässerungskontext

   Datenquelle: window.cottonRegionsData, befüllt von
   js/data.js aus der Supabase-Tabelle "cotton_regions".
   Diese Datei wartet auf window.dataReady, bevor sie
   zeichnet — sie enthält selbst keine Zahlen mehr.
   ============================================ */

'use strict';

(function () {
  const container = document.getElementById('cotton-map');
  if (!container || typeof d3 === 'undefined') return;

  const CATEGORY_LABEL = { niedrig: 'niedrig', hoch: 'hoch', sehr_hoch: 'sehr hoch' };
  const CATEGORY_COLOR = { niedrig: '#bcdcf5', hoch: '#c0533a', sehr_hoch: '#1a2744' };

  function formatWaterLine(region) {
    if (region.water_exact_value !== null && region.water_exact_value !== undefined) {
      return `${Number(region.water_exact_value).toLocaleString('de-DE')} L/kg Wasser`;
    }
    if (region.water_exact_min !== null && region.water_exact_min !== undefined
        && region.water_exact_max !== null && region.water_exact_max !== undefined) {
      const min = Number(region.water_exact_min).toLocaleString('de-DE');
      const max = Number(region.water_exact_max).toLocaleString('de-DE');
      return `${min}–${max} L/kg Wasser`;
    }
    const label = CATEGORY_LABEL[region.water_category] || region.water_category;
    return `Wasserverbrauch: ${label}`;
  }

  function buildTooltip(region) {
    const flag = region.flag ? region.flag + ' ' : '';
    // water_note (falls in Supabase gesetzt) ersetzt die automatisch
    // erzeugte Wasserzeile komplett — für Sonderfälle wie Turkmenistan.
    const waterLine = region.water_note || formatWaterLine(region);
    let text = `<strong>${flag}${region.name}</strong><br>`
      + `~${region.production_share}% der Weltproduktion. ${waterLine}.`;
    if (region.irrigation) {
      text += ` ${region.irrigation}.`;
    }
    return text;
  }

  const width = 760;
  const height = 420;

  const rootStyle = getComputedStyle(document.documentElement);
  const beigeMid   = rootStyle.getPropertyValue('--beige-mid').trim()   || '#e8dfc8';
  const beigeDark  = rootStyle.getPropertyValue('--beige-dark').trim() || '#c8b99a';
  const beigeLight = rootStyle.getPropertyValue('--beige-light').trim() || '#f5f0e8';

  function renderMap(cottonRegions) {
    if (!cottonRegions || !cottonRegions.length) {
      container.innerHTML = '<p class="map-loading-text">Keine Kartendaten gefunden. Ist die Tabelle "cotton_regions" in Supabase befüllt?</p>';
      return;
    }

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(cottonRegions, d => d.production_share)])
      .range([5, 21]);

    container.innerHTML = '';

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'map-svg')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Weltkarte: Hauptanbauländer für Baumwolle, Produktionsanteil und Wasserintensität');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', beigeLight)
      .attr('rx', 8);

    const projection = d3.geoNaturalEarth1()
      .scale(150)
      .translate([width / 2 - 20, height / 2 - 25]);

    const geoPath = d3.geoPath(projection);

    // Container für alles, was gezoomt/verschoben werden soll
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;

        zoomLayer.append('g')
          .attr('class', 'land-masses')
          .selectAll('path')
          .data(countries)
          .join('path')
            .attr('d', geoPath)
            .attr('fill', beigeMid)
            .attr('stroke', beigeDark)
            .attr('stroke-width', 0.4);

        const markers = zoomLayer.append('g').attr('class', 'cotton-markers');

        cottonRegions.forEach(region => {
          const feature = countries.find(c => String(c.id) === String(region.iso_numeric));
          if (!feature) return;
          const [x, y] = geoPath.centroid(feature);
          if (Number.isNaN(x) || Number.isNaN(y)) return;

          const r = radiusScale(region.production_share);
          const color = CATEGORY_COLOR[region.water_category] || beigeDark;

          const g = markers.append('g')
            .attr('class', 'cotton-region tooltip-trigger')
            .attr('data-tooltip', buildTooltip(region))
            .attr('transform', `translate(${x},${y})`)
            .style('cursor', 'pointer');

          g.append('circle')
            .attr('r', r)
            .attr('fill', color)
            .attr('opacity', 0.55)
            .attr('class', 'pulse');

          g.append('circle')
            .attr('r', r)
            .attr('fill', color)
            .attr('opacity', 0.85);
        });

        // ------------------------------------------
        // ZOOM: Mausrad/Pinch direkt auf der Karte,
        // plus +/- Buttons für Klick-Zoom
        // ------------------------------------------
        const zoomBehavior = d3.zoom()
          .scaleExtent([1, 6])
          .translateExtent([[0, 0], [width, height]])
          .on('zoom', (event) => {
            zoomLayer.attr('transform', event.transform);
          });

        svg.call(zoomBehavior);

        const zoomControls = document.createElement('div');
        zoomControls.className = 'map-zoom-controls';
        zoomControls.innerHTML = `
          <button type="button" class="map-zoom-btn" id="cotton-zoom-in" aria-label="Karte vergrößern">+</button>
          <button type="button" class="map-zoom-btn" id="cotton-zoom-out" aria-label="Karte verkleinern">−</button>
        `;
        container.appendChild(zoomControls);

        document.getElementById('cotton-zoom-in').addEventListener('click', () => {
          svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.4);
        });
        document.getElementById('cotton-zoom-out').addEventListener('click', () => {
          svg.transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.4);
        });

        const legend = document.createElement('div');
        legend.className = 'map-legend';
        legend.innerHTML = `
          <div class="map-legend-group">
            <p class="map-legend-heading">Kreisfarbe:</p>
            <p class="map-legend-sub">Wasserverbrauch der Länder im Vergleich</p>
            <div class="map-legend-row">
              <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.niedrig}"></span>niedrig</span>
              <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.hoch}"></span>hoch</span>
              <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.sehr_hoch}"></span>sehr hoch</span>
            </div>
          </div>
          <div class="map-legend-group">
            <p class="map-legend-heading">Kreisgröße:</p>
            <p class="map-legend-sub">Anteil an der weltweiten Baumwollproduktion</p>
          </div>
        `;
        container.appendChild(legend);

        container.removeAttribute('data-loading');

        // Tooltip-Events erst jetzt binden, da die Marker gerade
        // erst ins DOM eingefügt wurden.
        if (window.bindMapTooltips) window.bindMapTooltips(container);
      })
      .catch(err => {
        console.error('Weltkarte konnte nicht geladen werden:', err);
        container.innerHTML = '<p class="map-loading-text">Karte konnte nicht geladen werden. Bitte Internetverbindung prüfen.</p>';
      });
  }

  // Erst zeichnen, wenn data.js die Supabase-Daten geladen hat
  if (window.dataReady && typeof window.dataReady.then === 'function') {
    window.dataReady.then(() => renderMap(window.cottonRegionsData));
  } else {
    // Fallback, falls data.js aus irgendeinem Grund nicht geladen wurde
    console.warn('window.dataReady nicht gefunden — Karte wird ohne Wartezeit gerendert.');
    renderMap(window.cottonRegionsData || []);
  }
})();
