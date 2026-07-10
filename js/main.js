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
    let raw = el.dataset.count.replace(',', '.');
    // Überflüssige Nullen am Ende der Nachkommastellen entfernen,
    // egal wie viele in der Datenbank stehen (33.400 -> 33.4)
    if (raw.includes('.')) {
      raw = raw.replace(/0+$/, '').replace(/\.$/, '');
    }
    const target = parseFloat(raw);
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    animateCounterEl(el, target, 2000, decimals);
  });
}

function animateCounterEl(el, target, duration, decimals = 0) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = current.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Erst wenn Daten aus Supabase geladen sind, Counter starten
window.dataReady.then(() => {
  setTimeout(initHeroCounters, 200);
});

// ============================================
// ANIMATED BARS
// (die eigentliche Energie-Balken-Animation läuft
// weiter unten über einen eigenen, wiederholbaren
// Observer — hier nichts mehr nötig)
// ============================================

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
  let energyTimeouts = [];

  const energyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Live abfragen statt einmalig beim Laden — die Balken werden
      // erst später von data.js aus Supabase eingefügt und existieren
      // beim ersten Aufruf hier sonst noch gar nicht.
      const energySegs = energySegBar.querySelectorAll('.energy-seg');
      if (!energySegs.length) return;

      // Laufende, noch nicht ausgelöste Verzögerungen abbrechen,
      // falls schnell rein- und rausgescrollt wird.
      energyTimeouts.forEach(id => clearTimeout(id));
      energyTimeouts = [];

      if (entry.isIntersecting) {
        energySegs.forEach((el, i) => {
          const targetW = el.dataset.targetWidth || el.style.width || '0%';
          el.dataset.targetWidth = targetW;
          el.style.width = '0%';
          const id = setTimeout(() => {
            el.style.width = targetW;
          }, i * 150);
          energyTimeouts.push(id);
        });
      } else {
        energySegs.forEach(el => {
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

// Wird von data.js aufgerufen, NACHDEM die Hotspots aus Supabase
// ins DOM geschrieben wurden.
function bindPhotoHotspots() {
  if (!photoWrap || !photoTooltip) return;
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
window.bindPhotoHotspots = bindPhotoHotspots;

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

// Bindet die Klick-Events auf die Flow-Schritte. Wird von data.js
// aufgerufen, NACHDEM die Schritte aus Supabase ins DOM geschrieben
// wurden — vorher existieren die .flow-step-Elemente noch nicht.
function bindFlowSteps() {
  const flowSteps = document.querySelectorAll('.flow-step');
  flowSteps.forEach(step => {
    step.addEventListener('click', () => {
      flowSteps.forEach(s => s.classList.remove('active'));
      step.classList.add('active');
      if (flowInfoBox && step.dataset.info) {
        flowInfoBox.textContent = step.dataset.info;
      }
      scrollFlowStepIntoView(step);
    });
  });
}
window.bindFlowSteps = bindFlowSteps;

// ============================================
// INSIGHT TOGGLE (Glühbirnen-Fakten: Kapitel 2 + 6)
// ============================================

function initInsightToggle(btnId, contentId) {
  const btn = document.getElementById(btnId);
  const content = document.getElementById(contentId);
  if (!btn || !content) return;
  btn.addEventListener('click', () => {
    const isOpen = content.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

initInsightToggle('insight-btn', 'insight-text');
initInsightToggle('co2-insight-btn', 'co2-insight-text');
initInsightToggle('siegel-insight-btn', 'siegel-insight-text');

// ============================================
// KAPITEL 5 — PREIS-DONUT
// Wartet auf window.dataReady, da die Daten aus
// Supabase (price_breakdown) kommen.
// ============================================
window.dataReady.then(function () {
  const priceData = window.priceBreakdownData || [];
  if (!priceData.length) return;

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
});

// ============================================
// KAPITEL 6 — CO2-DONUT
// Wartet auf window.dataReady, da die Daten aus
// Supabase (co2_breakdown) kommen. Gleicher Aufbau
// wie der Preis-Donut in Kapitel 5.
// ============================================
window.dataReady.then(function () {
  const co2Data = window.co2BreakdownData || [];
  if (!co2Data.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const ring = document.getElementById("co2-donut");
  const labelsG = document.getElementById("co2-labels");
  const legendEl = document.getElementById("co2-legend");
  if (!ring || !labelsG || !legendEl) return;

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
      text.setAttribute("class", "price-pct-label");
      text.setAttribute("x", cx + r * cosA);
      text.setAttribute("y", cy + r * sinA);
      text.setAttribute("data-index", i);
      if (d.pct < 10) text.setAttribute("font-size", "7px");
      text.textContent = d.pct + "%";
      labelsG.appendChild(text);
    }

    cumulative += segLen;
  });

  co2Data.forEach((d, i) => {
    const item = document.createElement("div");
    item.className = "co2-legend-item";
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
    ring.querySelectorAll(".co2-donut-seg").forEach(seg => {
      seg.style.opacity = (index === null || parseInt(seg.dataset.index) === index) ? "1" : "0.35";
    });
    labelsG.querySelectorAll(".price-pct-label").forEach(lbl => {
      lbl.style.opacity = (index === null || parseInt(lbl.dataset.index) === index) ? "1" : "0.25";
    });
    labelsG.querySelectorAll(".price-leader").forEach(ln => {
      ln.style.opacity = (index === null || parseInt(ln.dataset.index) === index) ? "0.6" : "0.15";
    });
    legendEl.querySelectorAll(".co2-legend-item").forEach(item => {
      const isActive = index === null || parseInt(item.dataset.index) === index;
      item.style.opacity = isActive ? "1" : "0.5";
      item.classList.toggle("highlight", isActive && index !== null);
    });
  }

  ring.querySelectorAll(".co2-donut-seg").forEach(seg => {
    seg.addEventListener("mouseenter", () => highlightSeg(parseInt(seg.dataset.index)));
    seg.addEventListener("mouseleave", () => highlightSeg(null));
  });
});

// ============================================
// QUELLENVERZEICHNIS (ausklappbar über Footer-Link)
// ============================================

const sourcesToggleLink = document.getElementById('sources-toggle-link');
const sourcesCollapse = document.getElementById('sources-collapse');

if (sourcesToggleLink && sourcesCollapse) {
  sourcesToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = sourcesCollapse.classList.toggle('open');
    if (isOpen) {
      sourcesCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

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
