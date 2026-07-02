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
// ENERGY SEGMENT BAR — spielt bei jedem Reinscrollen
// neu ab (im Gegensatz zu den anderen Bars, die nur
// einmalig beim ersten Sichtbarwerden des Kapitels laufen)
// ============================================

const energySegBar = document.querySelector('.energy-segbar');

if (energySegBar) {
  const energySegs = energySegBar.querySelectorAll('.energy-seg');
  const energyTargets = new Map();
  energySegs.forEach(el => energyTargets.set(el, el.style.width || '0%'));

  const energyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        energySegs.forEach((el, i) => {
          el.style.transition = 'none';
          el.style.width = '0%';
          // Reflow erzwingen, damit der Browser den Reset auch
          // wirklich anwendet, bevor die neue Transition startet.
          void el.offsetWidth;
          el.style.transition = `width 0.9s ease ${i * 150}ms, filter 0.2s`;
          el.style.width = energyTargets.get(el);
        });
      } else {
        // Beim Verlassen ohne Animation zurücksetzen, damit der
        // nächste Eintritt wieder bei 0% startet.
        energySegs.forEach(el => {
          el.style.transition = 'none';
          el.style.width = '0%';
        });
      }
    });
  }, { threshold: 0.5 });

  energyObserver.observe(energySegBar);
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
// KAPITEL 3 — PHOTO-HOTSPOTS (Used-Look)
// ============================================

const photoTooltip = document.getElementById('photo-tooltip');
const photoWrap = document.getElementById('jeans-photo');

if (photoWrap && photoTooltip) {
  document.querySelectorAll('.photo-hotspot').forEach(spot => {
    spot.addEventListener('mouseenter', () => {
      document.querySelectorAll('.photo-hotspot').forEach(s => s.classList.remove('active'));
      spot.classList.add('active');
      photoTooltip.textContent = spot.dataset.tooltip;
      photoTooltip.classList.add('visible');

      const left = parseFloat(spot.style.left);
      const top = parseFloat(spot.style.top);
      // Tooltip links oder rechts vom Punkt positionieren, je nach Platz
      if (left > 55) {
        photoTooltip.style.right = (100 - left) + '%';
        photoTooltip.style.left = 'auto';
      } else {
        photoTooltip.style.left = (left + 6) + '%';
        photoTooltip.style.right = 'auto';
      }
      photoTooltip.style.top = Math.min(top, 60) + '%';
    });
    spot.addEventListener('mouseleave', () => {
      spot.classList.remove('active');
      photoTooltip.classList.remove('visible');
    });
  });
}

// ============================================
// KAPITEL 3 — REVEAL-BUTTON (Rana Plaza)
// ============================================

const ranaBtn = document.getElementById('rana-btn');
const ranaBox = document.getElementById('rana-box');

if (ranaBtn && ranaBox) {
  ranaBtn.addEventListener('click', () => {
    const isOpen = ranaBox.classList.toggle('open');
    ranaBtn.textContent = isOpen ? 'Weniger anzeigen' : 'Erfahre mehr';
    ranaBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

// ============================================
// FLOW DIAGRAM STEPS
// ============================================

const flowSteps = document.querySelectorAll('.flow-step');
const flowInfoBox = document.getElementById('flow-info');
const flowDiagram = document.getElementById('production-flow');

// Scrollt den (horizontal scrollbaren) Flow-Container so weit,
// dass der übergebene Schritt komplett sichtbar ist — zuverlässiger
// als scrollIntoView(), das in einigen Browsern bei horizontalem
// Scrollen innerhalb eines Containers nicht sauber funktioniert.
function scrollFlowStepIntoView(step) {
  if (!flowDiagram) return;
  const containerRect = flowDiagram.getBoundingClientRect();
  const stepRect = step.getBoundingClientRect();
  const buffer = 16;

  if (stepRect.right > containerRect.right) {
    flowDiagram.scrollBy({ left: stepRect.right - containerRect.right + buffer, behavior: 'smooth' });
  } else if (stepRect.left < containerRect.left) {
    flowDiagram.scrollBy({ left: stepRect.left - containerRect.left - buffer, behavior: 'smooth' });
  }
}

flowSteps.forEach(step => {
  step.addEventListener('click', () => {
    flowSteps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');
    if (flowInfoBox && step.dataset.info) {
      flowInfoBox.textContent = step.dataset.info;
    }
    // Angeklickten Schritt automatisch vollständig ins Bild scrollen,
    // falls er (z.B. Schritt 4) noch abgeschnitten ist.
    scrollFlowStepIntoView(step);
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
