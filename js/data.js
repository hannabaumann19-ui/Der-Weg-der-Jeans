/* ============================================
   JEANSUNSTICHED — Datenanbindung (Supabase)
   Lädt alle Inhalte aus der Datenbank und
   schreibt sie ins DOM, bevor main.js startet.
   ============================================ */

'use strict';

// ⚠️ Hier eure eigenen Werte eintragen (aus Project Settings → API):
const SUPABASE_URL = 'https://jrpethjnhpkccgyrnrak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5p71UNcnrkXHBZiennMYJA_8QB0gM97';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Wird von main.js NICHT mehr gebraucht, main.js wartet stattdessen
// auf dieses Event, bevor Counter/Balken/Beobachter starten.
window.dataReady = new Promise(async (resolve) => {
  try {
    await Promise.all([
      loadHeroStats(),
      loadChapter1Stats(),
      loadCottonRegions(),
      loadTransportData(),
      // weitere loadX()-Funktionen kommen hier Schritt für Schritt dazu
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
    pill.querySelector('.stat-num').dataset.target = row.value.replace(/\./g, '');
    pill.querySelector('.stat-unit').textContent = row.unit;
    pill.querySelector('.stat-label').textContent = row.label;
  });
}

// ============================================
// KAPITEL 1 STAT-CARDS (Wasser / Baumwolle / Menschen)
// ============================================
async function loadChapter1Stats() {
  const { data, error } = await supabaseClient
    .from('stats')
    .select('*')
    .eq('section', 'chapter1')
    .order('order_index');

  if (error) { console.error(error); return; }

  const cards = document.querySelectorAll('#chapter-1 .stats-grid .stat-card');
  data.forEach((row, i) => {
    const card = cards[i];
    if (!card) return;
    const valueEl = card.querySelector('.stat-value');
    // Falls die Zahl animiert werden soll (counter), data-target setzen:
    if (valueEl.classList.contains('counter')) {
      valueEl.dataset.target = row.value.replace(/\D/g, '');
    } else {
      valueEl.textContent = row.value;
    }
    card.querySelector('.stat-unit').textContent = row.unit;
    card.querySelector('.stat-desc').innerHTML = row.label;
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
