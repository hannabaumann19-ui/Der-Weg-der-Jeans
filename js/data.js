/* ============================================
   JEANSUNSTITCHED — Datenanbindung (Supabase)
   Lädt alle Inhalte aus der Datenbank und
   schreibt sie ins DOM, bevor main.js startet.
   ============================================ */

'use strict';

// ⚠️ Hier eure eigenen Werte eintragen (aus Project Settings → API):
const SUPABASE_URL = 'https://jrpethjnhpkccgyrnrak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5p71UNcnrkXHBZiennMYJA_8QB0gM97';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Wird von main.js/content-render.js genutzt, um zu warten, bis
// wirklich alle Supabase-Daten geladen sind, bevor irgendetwas
// gezeichnet, animiert oder befüllt wird.
window.dataReady = new Promise(async (resolve) => {
  try {
    await Promise.all([
      loadHeroStats(),
      loadStatCards('chapter1', '#chapter-1 .stats-grid .stat-card'),
      loadStatCards('chapter3', '#chapter-3 .stats-grid .stat-card'),
      loadCottonRegions(),
      loadTransportData(),
      loadContentBlocks(),
      loadMemorialEvent(),
      loadPhotoHotspots(),
      loadProductionSteps(),
      loadEnergyConsumption(),
      loadPriceBreakdown(),
      loadCo2Breakdown(),
      loadBalanceTiles(),
      loadActionTips(),
      loadCertifications(),
      loadSources(),
    ]);
  } catch (err) {
    console.error('Fehler beim Laden der Daten aus Supabase:', err);
  }
  resolve();
});

// ============================================
// HERO STATS (die drei Pillen ganz oben)
// ============================================
async function loadHeroStats() {
  const { data, error } = await supabaseClient
    .from('stats')
    .select('*')
    .eq('section', 'hero')
    .order('order_index');

  if (error) { console.error(error); return; }

  const pills = document.querySelectorAll('.hero-stats .stat-pill');
  data.forEach((row, i) => {
    const pill = pills[i];
    if (!pill) return;
    pill.querySelector('.stat-num').dataset.count = row.value;
    pill.querySelector('.stat-unit').textContent = row.unit;
    pill.querySelector('.stat-label').textContent = row.label;
  });
}

// ============================================
// STAT-CARDS (generisch — Kapitel 1 & Kapitel 3
// haben identische Kartenstruktur)
// ============================================
async function loadStatCards(section, containerSelector) {
  const { data, error } = await supabaseClient
    .from('stats')
    .select('*')
    .eq('section', section)
    .order('order_index');

  if (error) { console.error(error); return; }

  const cards = document.querySelectorAll(containerSelector);
  data.forEach((row, i) => {
    const card = cards[i];
    if (!card) return;
    const valueEl = card.querySelector('.stat-value');
    if (valueEl.classList.contains('counter')) {
      valueEl.dataset.target = row.value.replace(/\D/g, '');
    } else {
      valueEl.textContent = row.value;
    }
    const unitEl = card.querySelector('.stat-unit');
    if (unitEl) unitEl.textContent = row.unit;
    const descEl = card.querySelector('.stat-desc');
    if (descEl) descEl.innerHTML = row.label;
    const compareEl = card.querySelector('.stat-compare');
    if (compareEl && row.comparison) compareEl.textContent = row.comparison;
  });
}

// ============================================
// WASSERKARTE (Kapitel 1) — Baumwoll-Anbauländer
// world-map.js liest diese Daten, sobald window.dataReady
// aufgelöst ist — hier wird nur geladen, nicht gezeichnet.
// ============================================
window.cottonRegionsData = [];

async function loadCottonRegions() {
  const { data, error } = await supabaseClient
    .from('cotton_regions')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }
  window.cottonRegionsData = data;
}

// ============================================
// TRANSPORTKARTE (Kapitel 4) — Wegpunkte & Segmente
// transport-map.js liest diese Daten, sobald
// window.dataReady aufgelöst ist.
// ============================================
window.transportWaypointsData = [];
window.transportStepsData = [];

async function loadTransportData() {
  const [waypointsRes, stepsRes] = await Promise.all([
    supabaseClient.from('transport_waypoints').select('*').order('order_index'),
    supabaseClient.from('transport_steps').select('*').order('order_index')
  ]);

  if (waypointsRes.error) { console.error(waypointsRes.error); }
  else { window.transportWaypointsData = waypointsRes.data; }

  if (stepsRes.error) { console.error(stepsRes.error); }
  else { window.transportStepsData = stepsRes.data; }
}

// ============================================
// FREITEXT-BLÖCKE (Fließtexte über alle Kapitel verteilt)
// Wird direkt hier ins DOM geschrieben (Elemente mit
// data-content-key="..." im HTML).
// ============================================
async function loadContentBlocks() {
  const { data, error } = await supabaseClient
    .from('content_blocks')
    .select('*');

  if (error) { console.error(error); return; }

  const map = {};
  data.forEach(row => { map[row.key] = row.content; });
  window.contentBlocks = map;

  document.querySelectorAll('[data-content-key]').forEach(el => {
    const key = el.dataset.contentKey;
    if (map[key]) el.innerHTML = map[key];
  });
}

// ============================================
// MEMORIAL-BOX (Kapitel 3 — Rana Plaza)
// ============================================
async function loadMemorialEvent() {
  const { data, error } = await supabaseClient
    .from('memorial_events')
    .select('*')
    .eq('key', 'rana-plaza')
    .maybeSingle();

  if (error) { console.error(error); return; }
  if (!data) return;

  const box = document.getElementById('rana-box');
  if (!box) return;
  const img = box.querySelector('.memorial-img');
  if (img && data.image_path) {
    img.src = data.image_path;
  }
  const dateEl = box.querySelector('.memorial-date');
  if (dateEl) dateEl.textContent = data.date_label;
  const titleEl = box.querySelector('.memorial-title');
  if (titleEl) titleEl.textContent = data.title;
  const textEl = box.querySelector('.memorial-text');
  if (textEl) textEl.innerHTML = data.body;
}

// ============================================
// PHOTO-HOTSPOTS (Kapitel 3 — Used-Look)
// ============================================
window.photoHotspotsData = [];

async function loadPhotoHotspots() {
  const { data, error } = await supabaseClient
    .from('photo_hotspots')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }
  window.photoHotspotsData = data;

  const wrap = document.getElementById('jeans-photo');
  if (!wrap) return;
  wrap.querySelectorAll('.photo-hotspot').forEach(el => el.remove());

  const tooltipEl = document.getElementById('photo-tooltip');
  data.forEach(spot => {
    const el = document.createElement('div');
    el.className = 'photo-hotspot';
    el.style.left = spot.x_pct + '%';
    el.style.top = spot.y_pct + '%';
    el.dataset.tooltip = spot.info;
    wrap.insertBefore(el, tooltipEl);
  });

  if (window.bindPhotoHotspots) window.bindPhotoHotspots();
}

// ============================================
// PRODUCTION_STEPS (Kapitel 2 — Flow-Diagramm)
// ============================================
async function loadProductionSteps() {
  const { data, error } = await supabaseClient
    .from('production_steps')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }

  const flow = document.getElementById('production-flow');
  const infoBox = document.getElementById('flow-info');
  if (!flow) return;

  flow.innerHTML = '';
  data.forEach((step, i) => {
    if (i > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'flow-arrow';
      arrow.textContent = '→';
      flow.appendChild(arrow);
    }
    const stepEl = document.createElement('div');
    stepEl.className = 'flow-step' + (i === 0 ? ' active' : '');
    stepEl.dataset.info = step.info;
    stepEl.innerHTML = `
      <div class="flow-num">${step.step_num}</div>
      <div class="flow-icon">${step.icon}</div>
      <div class="flow-label">${step.label}</div>
      <div class="flow-loc">${step.loc}</div>
      <div class="flow-sub">${step.sub}</div>
    `;
    flow.appendChild(stepEl);
  });

  if (infoBox && data.length) infoBox.textContent = data[0].info;

  if (window.bindFlowSteps) window.bindFlowSteps();
}

// ============================================
// ENERGY_CONSUMPTION (Kapitel 2 — Energie-Balken)
// ============================================
async function loadEnergyConsumption() {
  const { data, error } = await supabaseClient
    .from('energy_consumption')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }
  window.energyConsumptionData = data;

  const legend = document.querySelector('.energy-legend');
  const bar = document.querySelector('.energy-segbar');
  if (!legend || !bar) return;

  legend.innerHTML = '';
  bar.innerHTML = '';
  let ariaLabel = 'Energieverteilung: ';

  data.forEach((seg, i) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'energy-legend-item';
    legendItem.dataset.index = i;
    legendItem.innerHTML = `
      <span class="energy-dot ${seg.category_key}"></span>
      <span class="energy-legend-text">${seg.label} — ${seg.pct}%${seg.kwh_note ? `<span class="energy-legend-kwh">${seg.kwh_note}</span>` : ''}</span>
    `;
    legend.appendChild(legendItem);

    const segEl = document.createElement('div');
    segEl.className = 'energy-seg ' + seg.category_key;
    segEl.dataset.index = i;
    segEl.style.width = seg.pct + '%';
    segEl.textContent = seg.pct >= 10 ? seg.pct + '%' : '';
    bar.appendChild(segEl);

    ariaLabel += `${seg.label} ${seg.pct}%${seg.kwh_note ? ', ' + seg.kwh_note : ''}, `;
  });
  bar.setAttribute('aria-label', ariaLabel.replace(/, $/, ''));

  // Hover-Verknüpfung: Balken-Segment <-> Legenden-Eintrag,
  // exakt das gleiche Prinzip wie bei den Kreisdiagrammen.
  function highlightEnergy(index) {
    bar.querySelectorAll('.energy-seg').forEach(seg => {
      seg.style.opacity = (index === null || parseInt(seg.dataset.index) === index) ? '1' : '0.35';
    });
    legend.querySelectorAll('.energy-legend-item').forEach(item => {
      const isActive = index === null || parseInt(item.dataset.index) === index;
      item.style.opacity = isActive ? '1' : '0.5';
      item.classList.toggle('highlight', isActive && index !== null);
    });
  }

  bar.querySelectorAll('.energy-seg').forEach(seg => {
    seg.addEventListener('mouseenter', () => highlightEnergy(parseInt(seg.dataset.index)));
    seg.addEventListener('mouseleave', () => highlightEnergy(null));
  });
  legend.querySelectorAll('.energy-legend-item').forEach(item => {
    item.addEventListener('mouseenter', () => highlightEnergy(parseInt(item.dataset.index)));
    item.addEventListener('mouseleave', () => highlightEnergy(null));
  });
}

// ============================================
// PRICE_BREAKDOWN (Kapitel 5 — Preis-Donut)
// Wird als Daten-Array bereitgestellt; main.js
// zeichnet daraus das SVG-Donut-Diagramm.
// ============================================
window.priceBreakdownData = [];

async function loadPriceBreakdown() {
  const { data, error } = await supabaseClient
    .from('price_breakdown')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }
  window.priceBreakdownData = data.map(row => ({
    label: row.label,
    pct: Number(row.pct),
    eur: row.eur,
    color: row.color_var,
    dark: row.dark_label
  }));
}

// ============================================
// CO2_BREAKDOWN (Kapitel 6 — CO2-Donut)
// ============================================
window.co2BreakdownData = [];

async function loadCo2Breakdown() {
  const { data, error } = await supabaseClient
    .from('co2_breakdown')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }
  window.co2BreakdownData = data.map(row => ({
    label: row.label,
    pct: Number(row.pct),
    kg: Number(row.kg),
    color: row.color_var,
    highlight: row.highlight
  }));
}

// ============================================
// BALANCE_TILES (Kapitel 6 — Gesamtbilanz)
// ============================================
async function loadBalanceTiles() {
  const { data, error } = await supabaseClient
    .from('balance_tiles')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }

  const grid = document.querySelector('.balance-grid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'balance-tile';
    el.innerHTML = `
      <div class="balance-icon">${tile.icon}</div>
      <div class="balance-value">${tile.value}</div>
      <div class="balance-label">${tile.label}</div>
    `;
    grid.appendChild(el);
  });
}

// ============================================
// ACTION_TIPS (Kapitel 7 — Tipp-Karten)
// ============================================
async function loadActionTips() {
  const { data, error } = await supabaseClient
    .from('action_tips')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }

  const grid = document.querySelector('.tips-grid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach(tip => {
    const el = document.createElement('div');
    el.className = 'tip-card';
    el.innerHTML = `
      <div class="tip-num">${tip.num}</div>
      <div class="tip-title">${tip.title}</div>
      <div class="tip-text">${tip.body}</div>
    `;
    grid.appendChild(el);
  });
}

// ============================================
// CERTIFICATIONS (Kapitel 7 — Gütesiegel)
// ============================================
async function loadCertifications() {
  const { data, error } = await supabaseClient
    .from('certifications')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }

  const grid = document.querySelector('.label-grid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach(cert => {
    const stars = '★'.repeat(cert.rating_stars) +
      (cert.rating_stars < 5 ? `<span class="star-empty">${'★'.repeat(5 - cert.rating_stars)}</span>` : '');
    const el = document.createElement('div');
    el.className = 'label-item label-' + cert.tier;
    el.innerHTML = `
      <div class="label-badge">${cert.badge}</div>
      <div class="label-name">${cert.name}</div>
      <div class="label-desc">${cert.description}</div>
      <div class="label-rating">${stars}</div>
    `;
    grid.appendChild(el);
  });
}

// ============================================
// SOURCES (Quellenverzeichnis)
// ============================================
async function loadSources() {
  const { data, error } = await supabaseClient
    .from('sources')
    .select('*')
    .order('order_index');

  if (error) { console.error(error); return; }

  const list = document.querySelector('.sources-list');
  if (!list) return;
  list.innerHTML = '';
  data.forEach(src => {
    const li = document.createElement('li');
    if (src.url) {
      li.innerHTML = `<a href="${src.url}" target="_blank" rel="noopener">${src.title}</a>`;
    } else {
      li.textContent = src.title;
    }
    list.appendChild(li);
  });
}
