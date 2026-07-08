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
// KAPITEL 5 — PREIS-DONUT
// ============================================
(function () {
  const priceData = [
    { label: "Einzelhandel",   pct: 40, eur: "20,00 €", color: "var(--navy)" },
    { label: "Marke / Import", pct: 25, eur: "12,50 €", color: "var(--terracotta)" },
    { label: "Materialien",    pct: 18, eur: "9,00 €",  color: "var(--beige-dark)", dark: true },
    { label: "Transport",      pct: 12, eur: "6,00 €",  color: "var(--amber)" },
    { label: "Arbeitslöhne",   pct: 3,  eur: "1,50 €",  color: "var(--sage-dark)" },
    { label: "Steuern etc.",   pct: 2,  eur: "1,00 €",  color: "var(--beige-mid)", dark: true },
  ];

  const svgNS = "http://www.w3.org/2000/svg";
  const ring = document.getElementById("price-donut");
  const labelsG = document.getElementById("price-labels");
  if (!ring || !labelsG) return;

  const r = 50, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  priceData.forEach((d, i) => {
    const segLen = (d.pct / 100) * circumference;

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("class", "price-donut-seg");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("stroke", d.color);
    circle.setAttribute("stroke-dasharray", `${segLen} ${circumference - segLen}`);
    circle.setAttribute("stroke-dashoffset", -cumulative);
    circle.setAttribute("data-index", i);
    ring.appendChild(circle);

    const midLen = cumulative + segLen / 2;
    const angle = (midLen / circumference) * 2 * Math.PI - Math.PI / 2;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);

    if (d.pct < 5) {
      const outerR = r + 15, lineEndR = r + 26, textR = r + 30;

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("class", "price-leader");
      line.setAttribute("x1", cx + outerR * cosA);
      line.setAttribute("y1", cy + outerR * sinA);
      line.setAttribute("x2", cx + lineEndR * cosA);
      line.setAttribute("y2", cy + lineEndR * sinA);
      line.setAttribute("data-index", i);
      labelsG.appendChild(line);

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "price-pct-label outside");
      text.setAttribute("x", cx + textR * cosA);
      text.setAttribute("y", cy + textR * sinA);
      text.setAttribute("data-index", i);
      text.setAttribute("text-anchor", cosA > 0.2 ? "start" : cosA < -0.2 ? "end" : "middle");
      text.textContent = d.pct + "%";
      labelsG.appendChild(text);
    } else {
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("class", "price-pct-label" + (d.dark ? " dark" : ""));
      text.setAttribute("x", cx + r * cosA);
      text.setAttribute("y", cy + r * sinA);
      text.setAttribute("data-index", i);
      if (d.pct < 10) text.setAttribute("font-size", "7px");
      text.textContent = d.pct + "%";
      labelsG.appendChild(text);
    }

    cumulative += segLen;
  });

  const legendEl = document.getElementById("price-legend");
  priceData.forEach((d, i) => {
    const item = document.createElement("div");
    item.className = "price-legend-item";
    item.dataset.index = i;
    item.innerHTML = `
      <span class="price-legend-dot" style="background:${d.color}"></span>
      <span class="price-legend-text">${d.label}</span>
      <span class="price-legend-eur">${d.eur}</span>
      <span class="price-legend-pct">${d.pct}%</span>
    `;
    legendEl.appendChild(item);
    item.addEventListener("mouseenter", () => highlightPriceSeg(i));
    item.addEventListener("mouseleave", () => highlightPriceSeg(null));
  });

  function highlightPriceSeg(index) {
    ring.querySelectorAll(".price-donut-seg").forEach(seg => {
      seg.style.opacity = (index === null || parseInt(seg.dataset.index) === index) ? "1" : "0.35";
    });
    labelsG.querySelectorAll(".price-pct-label").forEach(lbl => {
      lbl.style.opacity = (index === null || parseInt(lbl.dataset.index) === index) ? "1" : "0.25";
    });
    labelsG.querySelectorAll(".price-leader").forEach(ln => {
      ln.style.opacity = (index === null || parseInt(ln.dataset.index) === index) ? "0.6" : "0.15";
    });
    legendEl.querySelectorAll(".price-legend-item").forEach(item => {
      const isActive = index === null || parseInt(item.dataset.index) === index;
      item.style.opacity = isActive ? "1" : "0.5";
      item.classList.toggle("highlight", isActive && index !== null);
    });
  }

  ring.querySelectorAll(".price-donut-seg").forEach(seg => {
    seg.addEventListener("mouseenter", () => highlightPriceSeg(parseInt(seg.dataset.index)));
    seg.addEventListener("mouseleave", () => highlightPriceSeg(null));
  });
})();

// ============================================
// KAPITEL 6 — CO2-DONUT
// ============================================
(function () {
  const co2Data = [
    { label: "Nutzung (Waschen/Trocknen)", pct: 37, kg: 12.5, color: "var(--terracotta)", highlight: true },
    { label: "Spinnen & Weben",            pct: 27, kg: 9.0,  color: "var(--navy)" },
    { label: "Baumwollanbau",              pct: 11, kg: 3.8,  color: "var(--sage)" },
    { label: "Nähen & Veredeln",           pct: 9,  kg: 2.9,  color: "var(--sage-dark)" },
    { label: "Transport & Handel",         pct: 8,  kg: 2.6,  color: "var(--amber)" },
    { label: "Zubehör & Verpackung",       pct: 5,  kg: 1.7,  color: "var(--beige-dark)" },
    { label: "Entsorgung",                 pct: 3,  kg: 0.9,  color: "var(--beige-mid)" },
  ];

  const svg = document.getElementById("co2-donut");
  const legendEl = document.getElementById("co2-legend");
  if (!svg || !legendEl) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const r = 50, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  co2Data.forEach((d, i) => {
    const segLen = (d.pct / 100) * circumference;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("class", "co2-donut-seg");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("stroke", d.color);
    circle.setAttribute("stroke-dasharray", `${segLen} ${circumference - segLen}`);
    circle.setAttribute("stroke-dashoffset", -cumulative);
    circle.setAttribute("data-index", i);
    svg.appendChild(circle);
    cumulative += segLen;
  });

  co2Data.forEach((d, i) => {
    const item = document.createElement("div");
    item.className = "co2-legend-item" + (d.highlight ? " highlight" : "");
    item.dataset.index = i;
    item.innerHTML = `
      <span class="co2-legend-dot" style="background:${d.color}"></span>
      <span class="co2-legend-text">${d.label}</span>
      <span class="co2-legend-kg">${d.kg.toLocaleString('de-DE', {minimumFractionDigits:1})} kg</span>
      <span class="co2-legend-pct">${d.pct}%</span>
    `;
    legendEl.appendChild(item);
    item.addEventListener("mouseenter", () => highlightSeg(i));
    item.addEventListener("mouseleave", () => highlightSeg(null));
  });

  function highlightSeg(index) {
    svg.querySelectorAll(".co2-donut-seg").forEach(seg => {
      seg.style.opacity = (index === null || parseInt(seg.dataset.index) === index) ? "1" : "0.35";
    });
    legendEl.querySelectorAll(".co2-legend-item").forEach(item => {
      item.style.opacity = (index === null || parseInt(item.dataset.index) === index) ? "1" : "0.5";
    });
  }

  svg.querySelectorAll(".co2-donut-seg").forEach(seg => {
    seg.addEventListener("mouseenter", () => highlightSeg(parseInt(seg.dataset.index)));
    seg.addEventListener("mouseleave", () => highlightSeg(null));
  });
})();

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
