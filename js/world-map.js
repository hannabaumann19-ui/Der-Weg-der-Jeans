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

  // Manuelle Label-Positionen je Land (per ISO-Nummerncode).
  // Nötig, weil einige Anbauländer geografisch eng beieinander liegen
  // (Indien/Pakistan/China bzw. Usbekistan/Turkmenistan) — eine
  // automatische "immer mittig unter dem Kreis"-Regel würde dort
  // Labels übereinanderlappen lassen.
  const LABEL_OFFSETS = {
    '356': { dx: 18,  dy: 6,   anchor: 'start'  }, // Indien — rechts
    '586': { dx: -20, dy: -16, anchor: 'end'    }, // Pakistan — oben links
    '156': { dx: 6,   dy: -26, anchor: 'start'  }, // China — oben
    '792': { dx: -18, dy: 4,   anchor: 'end'    }, // Türkei — links
    '860': { dx: -18, dy: -12, anchor: 'end'    }, // Usbekistan — oben links
    '795': { dx: 18,  dy: 18,  anchor: 'start'  }, // Turkmenistan — unten rechts
    '840': { dx: 0,   dy: 0,   anchor: 'middle' }, // USA — Standard (unter Kreis)
    '76':  { dx: 0,   dy: 0,   anchor: 'middle' }  // Brasilien — Standard (unter Kreis)
  };

  function formatWaterLine(region) {
    if (region.water_exact_value !== null && region.water_exact_value !== undefined) {
      return `${Number(region.water_exact_value).toLocaleString('de-DE')} L/kg Wasser (${region.water_exact_source})`;
    }
    if (region.water_exact_min !== null && region.water_exact_min !== undefined
        && region.water_exact_max !== null && region.water_exact_max !== undefined) {
      const min = Number(region.water_exact_min).toLocaleString('de-DE');
      const max = Number(region.water_exact_max).toLocaleString('de-DE');
      return `${min}–${max} L/kg Wasser (${region.water_exact_source})`;
    }
    const label = CATEGORY_LABEL[region.water_category] || region.water_category;
    return `Wasserintensität: ${label} — keine belastbare Literzahl verfügbar`;
  }

  function buildTooltip(region) {
    const flag = region.flag ? region.flag + ' ' : '';
    return `${flag}${region.name}: ~${region.production_share}% der Weltproduktion. `
      + `${formatWaterLine(region)}. ${region.irrigation || ''}.`;
  }

  const width = 760;
  const height = 420;

  const rootStyle = getComputedStyle(document.documentElement);
  const beigeMid   = rootStyle.getPropertyValue('--beige-mid').trim()   || '#e8dfc8';
  const beigeDark  = rootStyle.getPropertyValue('--beige-dark').trim() || '#c8b99a';
  const beigeLight = rootStyle.getPropertyValue('--beige-light').trim() || '#f5f0e8';
  const navy       = rootStyle.getPropertyValue('--navy').trim()        || '#1a2744';

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
      .scale(126)
      .translate([width / 2 - 13, height / 2 + 8]);

    const geoPath = d3.geoPath(projection);

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;

        svg.append('g')
          .attr('class', 'land-masses')
          .selectAll('path')
          .data(countries)
          .join('path')
            .attr('d', geoPath)
            .attr('fill', beigeMid)
            .attr('stroke', beigeDark)
            .attr('stroke-width', 0.4);

        const markers = svg.append('g').attr('class', 'cotton-markers');

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

          const offset = LABEL_OFFSETS[String(region.iso_numeric)];
          const labelX = offset ? offset.dx : 0;
          const labelY = offset ? offset.dy : (r + 13);
          const anchor = offset ? offset.anchor : 'middle';

          // Dünne Verbindungslinie, wenn das Label seitlich/oben
          // versetzt ist — sonst ist nicht eindeutig, zu welchem
          // Kreis das Label gehört.
          if (offset && (offset.dx !== 0 || offset.dy !== 0)) {
            g.append('line')
              .attr('x1', 0).attr('y1', 0)
              .attr('x2', labelX * 0.55).attr('y2', labelY * 0.55)
              .attr('stroke', beigeDark)
              .attr('stroke-width', 0.6)
              .attr('opacity', 0.6);
          }

          g.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', anchor)
            .attr('font-size', 10.5)
            .attr('font-weight', 500)
            .attr('font-family', 'DM Sans')
            .attr('fill', navy)
            .attr('paint-order', 'stroke')
            .attr('stroke', beigeLight)
            .attr('stroke-width', 3)
            .style('pointer-events', 'none')
            .text(region.name);
        });

        const legend = document.createElement('div');
        legend.className = 'map-legend';
        legend.innerHTML = `
          <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.niedrig}"></span>niedrig</span>
          <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.hoch}"></span>hoch</span>
          <span class="map-legend-item"><span class="map-legend-dot" style="background:${CATEGORY_COLOR.sehr_hoch}"></span>sehr hoch</span>
          <span class="map-legend-note">Kreisgröße = Anteil an der Weltproduktion</span>
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
