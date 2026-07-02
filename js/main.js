/* ============================================
   JEAN-CLAUDE — Hauptskript
   Interaktivität, Animationen, Scroll-Effekte
   ============================================ */

'use strict';

// ============================================
// SCROLL PROGRESS & NAV
// ============================================

const progressBar = document.getElementById('progress-bar');
const nav = document.getElementById('main-nav');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / docHeight) * 100;
  progressBar.style.width = progress + '%';

  nav.classList.toggle('scrolled', scrollTop > 50);

  updateActiveChapter();
  triggerVisibleAnimations();
});

// ============================================
// CHAPTER NAVIGATION
// ============================================

const chapters = document.querySelectorAll('.chapter');
const chapterDots = document.querySelectorAll('.chapter-dot');

function updateActiveChapter() {
  let current = '';
  chapters.forEach(ch => {
    const rect = ch.getBoundingClientRect();
    if (rect.top <= 200 && rect.bottom > 200) {
      current = ch.id;
    }
  });
  chapterDots.forEach(dot => {
    dot.classList.toggle('active', dot.dataset.target === current);
  });
}

chapterDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function scrollToChapter(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.scrollToChapter = scrollToChapter;

// ============================================
// INTERSECTION OBSERVER — FADE IN CHAPTERS
// ============================================

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Trigger counters when chapter is visible
      triggerCounters(entry.target);
      triggerBars(entry.target);
    }
  });
}, { threshold: 0.1 });

chapters.forEach(ch => observer.observe(ch));

// ============================================
// ANIMATED COUNTERS
// ============================================

function triggerCounters(container) {
  const counters = container.querySelectorAll('.counter:not(.counted)');
  counters.forEach(el => {
    el.classList.add('counted');
    animateCounter(el, parseInt(el.dataset.target || 0));
  });
}

function animateCounter(el, target) {
  const duration = 1800;
  const start = performance.now();
  const startVal = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (target - startVal) * eased);
    el.textContent = current.toLocaleString('de-DE');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Hero counters
function initHeroCounters() {
  const heroNums = document.querySelectorAll('.stat-num[data-count]');
  heroNums.forEach(el => {
    const target = parseInt(el.dataset.count);
    animateCounterEl(el, target, 2000);
  });
}

function animateCounterEl(el, target, duration) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString('de-DE');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Erst wenn Daten aus Supabase geladen sind, Counter starten
window.dataReady.then(() => {
  setTimeout(initHeroCounters, 200);
});

// ============================================
// ANIMATED BARS (CO2, BAR CHARTS)
// ============================================

const barsTriggered = new Set();

function triggerBars(container) {
  const co2Fills = container.querySelectorAll('.co2-fill');
  co2Fills.forEach((el, i) => {
    if (!barsTriggered.has(el)) {
      barsTriggered.add(el);
      const targetW = el.style.getPropertyValue('--w') || '0%';
      el.style.width = '0%';
      setTimeout(() => {
        el.style.width = targetW;
      }, 200 + i * 100);
    }
  });

  const barFills = container.querySelectorAll('.bar-fill');
  barFills.forEach((el, i) => {
    if (!barsTriggered.has(el)) {
      barsTriggered.add(el);
      const targetW = el.style.getPropertyValue('--w') || '0%';
      el.style.width = '0%';
      setTimeout(() => {
        el.style.transition = 'width 1s ease ' + (i * 150) + 'ms';
        el.style.width = targetW;
      }, 300);
    }
  });
}

function triggerVisibleAnimations() {
  // Triggered by scroll for elements not in chapters
}

// ============================================
// MAP TOOLTIPS (Cotton Map)
// Die Karte selbst wird von js/world-map.js per D3
// erzeugt, sobald die Supabase-Daten geladen sind.
// Diese Funktion bindet die Tooltip-Events, sobald
// die Marker im DOM stehen — world-map.js ruft sie
// nach dem Rendern auf.
// ============================================

const mapTooltip = document.getElementById('map-tooltip');

function bindMapTooltips(container) {
  if (!container || !mapTooltip) return;
  const triggers = container.querySelectorAll('.tooltip-trigger');
  triggers.forEach(el => {
    el.addEventListener('mouseenter', () => {
      const text = el.dataset.tooltip;
      if (!text) return;
      mapTooltip.innerHTML = text;
      mapTooltip.classList.add('visible');
    });
    el.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left + 12;
      let y = e.clientY - rect.top - 10;
      if (x + 260 > rect.width) x -= 270;
      if (y < 0) y = 10;
      mapTooltip.style.left = x + 'px';
      mapTooltip.style.top  = y + 'px';
    });
    el.addEventListener('mouseleave', () => {
      mapTooltip.classList.remove('visible');
    });
  });
}
window.bindMapTooltips = bindMapTooltips;

// ============================================
// ARALSEE VORHER/NACHHER-SLIDER
// ============================================

const aralRange = document.getElementById('aral-range');
const aralBeforeImg = document.getElementById('aral-before-img');
const aralHandle = document.getElementById('aral-handle');
const aralFactText = document.getElementById('aral-fact-text');

if (aralRange && aralBeforeImg && aralHandle && aralFactText) {
  const ARAL_TEXT_BEFORE = aralFactText.textContent;
  const ARAL_TEXT_AFTER = 'Das Ergebnis: Der See ist heute auf rund 10 Prozent seines ursprünglichen Volumens geschrumpft, eine der größten von Menschen verursachten Umweltkatastrophen der Geschichte. Fischerdörfer liegen heute Dutzende Kilometer von der nächsten Wasserlinie entfernt. Der Meeresboden ist zur Wüste geworden.';

  let aralShowingAfter = false;

  function updateAralSlider(value) {
    aralBeforeImg.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    aralHandle.style.left = value + '%';

    const showAfter = value < 50;
    if (showAfter !== aralShowingAfter) {
      aralShowingAfter = showAfter;
      aralFactText.style.opacity = '0';
      setTimeout(() => {
        aralFactText.textContent = showAfter ? ARAL_TEXT_AFTER : ARAL_TEXT_BEFORE;
        aralFactText.style.opacity = '1';
      }, 200);
    }
  }

  aralRange.addEventListener('input', (e) => updateAralSlider(Number(e.target.value)));
  updateAralSlider(Number(aralRange.value));
}

// ============================================
// JEANS ANATOMY TOOLTIPS
// ============================================

const anatomyTooltip = document.getElementById('anatomy-tooltip');

document.querySelectorAll('.hotspot').forEach(el => {
  el.addEventListener('mouseenter', (e) => {
    const text = el.dataset.tooltip;
    if (!text || !anatomyTooltip) return;
    anatomyTooltip.textContent = text;
    anatomyTooltip.classList.add('visible');
  });
  el.addEventListener('mousemove', (e) => {
    if (!anatomyTooltip) return;
    const parent = anatomyTooltip.parentElement.getBoundingClientRect();
    let x = e.clientX - parent.left + 12;
    let y = e.clientY - parent.top - 10;
    if (x + 260 > parent.width) x -= 270;
    if (y < 0) y = 10;
    anatomyTooltip.style.left = x + 'px';
    anatomyTooltip.style.top  = y + 'px';
  });
  el.addEventListener('mouseleave', () => {
    if (anatomyTooltip) anatomyTooltip.classList.remove('visible');
  });
});

// ============================================
// FLOW DIAGRAM STEPS
// ============================================

const flowSteps = document.querySelectorAll('.flow-step');
const flowInfoBox = document.getElementById('flow-info');

flowSteps.forEach(step => {
  step.addEventListener('click', () => {
    flowSteps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');
    if (flowInfoBox && step.dataset.info) {
      flowInfoBox.textContent = step.dataset.info;
    }
    // Angeklickten Schritt automatisch vollständig ins Bild scrollen,
    // falls er (z.B. Schritt 4) noch abgeschnitten ist.
    step.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  });
});

// ============================================
// INSIGHT TOGGLE (Kapitel 2 — Energiekarte)
// ============================================

const insightBtn = document.getElementById('insight-btn');
const insightContent = document.getElementById('insight-text');

if (insightBtn && insightContent) {
  insightBtn.addEventListener('click', () => {
    const isOpen = insightContent.classList.toggle('open');
    insightBtn.classList.toggle('active', isOpen);
    insightBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

// ============================================
// CHEMICALS INFO
// ============================================

const chemInfo = document.getElementById('chem-info');

window.showChemInfo = function(text) {
  if (chemInfo) chemInfo.textContent = text;
};
window.hideChemInfo = function() {
  if (chemInfo) chemInfo.textContent = 'Hover über eine Chemikalie für Details';
};

// ============================================
// TRANSPORT ROUTE ANIMATION
// ============================================

let routeAnimated = false;

window.animateRoute = function() {
  if (routeAnimated) {
    resetRoute();
    setTimeout(playRoute, 100);
  } else {
    playRoute();
  }
};

function resetRoute() {
  routeAnimated = false;
  const btn = document.getElementById('animate-route-btn');
  if (btn) btn.textContent = '▶ Route abspielen';

  ['route-seg1','route-seg2','route-seg3','route-seg4'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const len = el.getTotalLength ? el.getTotalLength() : 200;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.transition = 'none';
  });

  ['city-hamburg','city-wuerzburg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.transition = 'none'; el.style.opacity = '0'; }
  });

  document.querySelectorAll('.t-step').forEach(s => s.classList.remove('active'));
}

function playRoute() {
  routeAnimated = true;
  const btn = document.getElementById('animate-route-btn');
  if (btn) btn.textContent = '↺ Neu starten';

  const steps = [
    { seg: 'route-seg1', stepId: 'step-1', delay: 0,    duration: 1200 },
    { seg: 'route-seg2', stepId: 'step-2', delay: 800,  duration: 1800 },
    { seg: null,         stepId: 'step-3', delay: 2000, duration: 0 },
    { seg: 'route-seg3', stepId: 'step-4', delay: 2200, duration: 1200, showCity: 'city-hamburg' },
    { seg: 'route-seg4', stepId: 'step-5', delay: 3600, duration: 600,  showCity: 'city-wuerzburg' },
  ];

  // Initialize all paths
  ['route-seg1','route-seg2','route-seg3','route-seg4'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Use approximate lengths
    const lengths = { 'route-seg1': 80, 'route-seg2': 200, 'route-seg3': 120, 'route-seg4': 30 };
    const len = lengths[id] || 100;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.transition = 'none';
  });

  // Animate ship icon along route
  animateShip();

  steps.forEach(({ seg, stepId, delay, duration, showCity }) => {
    setTimeout(() => {
      // Activate step indicator
      const stepEl = document.getElementById(stepId);
      if (stepEl) stepEl.classList.add('active');

      // Draw route segment
      if (seg) {
        const el = document.getElementById(seg);
        if (el) {
          el.style.transition = `stroke-dashoffset ${duration}ms ease`;
          el.style.strokeDashoffset = '0';
        }
      }

      // Show city marker
      if (showCity) {
        const cityEl = document.getElementById(showCity);
        if (cityEl) {
          cityEl.style.transition = 'opacity 0.5s ease';
          cityEl.style.opacity = '1';
        }
      }
    }, delay);
  });
}

function animateShip() {
  const ship = document.getElementById('ship-icon');
  if (!ship) return;

  // Simple waypoint animation
  const waypoints = [
    { x: 480, y: 163 },
    { x: 460, y: 210 },
    { x: 390, y: 190 },
    { x: 340, y: 165 },
    { x: 315, y: 135 },
    { x: 295, y: 98 },
    { x: 293, y: 105 }
  ];

  let i = 0;
  const totalTime = 4000;
  const stepTime = totalTime / (waypoints.length - 1);

  function moveToNext() {
    if (i >= waypoints.length - 1) return;
    i++;
    const wp = waypoints[i];
    ship.style.transition = `transform ${stepTime}ms linear`;
    const dx = wp.x - 480;
    const dy = wp.y - 163;

    // Change icon when arriving Hamburg
    if (i >= 6) {
      ship.querySelector('text').textContent = '🚛';
    }

    ship.setAttribute('transform', `translate(${wp.x},${wp.y})`);
    setTimeout(moveToNext, stepTime);
  }

  ship.setAttribute('transform', `translate(480,163)`);
  setTimeout(moveToNext, 200);
}

// ============================================
// PRICE BREAKDOWN
// ============================================

const priceInfoPanel = document.getElementById('price-info');

window.showPriceInfo = function(who, pct, eur, desc) {
  if (!priceInfoPanel) return;
  priceInfoPanel.innerHTML = `
    <strong style="color:var(--navy)">${who}</strong> — ${pct} (${eur})<br>
    <span style="color:var(--navy-faded);font-size:0.82rem">${desc}</span>
  `;
};

window.hidePriceInfo = function() {
  if (priceInfoPanel) priceInfoPanel.innerHTML = '← Hover für Details zu jedem Anteil';
};

// ============================================
// KEYBOARD ACCESSIBILITY FOR CHAPTER NAVIGATION
// ============================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    const active = document.querySelector('.chapter-dot.active');
    const next = active ? active.nextElementSibling : null;
    if (next && next.classList.contains('chapter-dot')) next.click();
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const active = document.querySelector('.chapter-dot.active');
    const prev = active ? active.previousElementSibling : null;
    if (prev && prev.classList.contains('chapter-dot')) prev.click();
  }
});

// ============================================
// INITIAL LOAD — trigger chapter 1 if in view
// ============================================

window.addEventListener('load', async () => {
  await window.dataReady;
  // Manually check initial visible state
  chapters.forEach(ch => {
    const rect = ch.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      ch.classList.add('visible');
      triggerCounters(ch);
      triggerBars(ch);
    }
  });

  // First chapter always visible
  const ch1 = document.getElementById('chapter-1');
  if (ch1) {
    ch1.classList.add('visible');
    triggerCounters(ch1);
  }

  // Update nav on load
  updateActiveChapter();
});
