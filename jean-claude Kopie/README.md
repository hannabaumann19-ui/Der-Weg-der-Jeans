# Jean-Claude 👖

**Interaktive Dokumentation: Die Reise einer Jeans von der Baumwollernte bis zum Verkauf**

Entwickelt für das Modul *Interaktive Medien*.

## Live-Demo

👉 [GitHub Pages Link hier einfügen nach Deployment]

## Über das Projekt

Jean-Claude erzählt die Geschichte einer Jeans im „Follow the Thing"-Ansatz — von Usbekistans Baumwollfeldern bis in den Kleiderschrank in Würzburg. Die Website visualisiert:

- 🌍 **Interaktive Weltkarte** mit Baumwollregionen und Hover-Tooltips
- 💧 **Ressourcenverbrauch** (7.000 L Wasser, 33 kg CO₂)
- 🏭 **Produktionsprozess** als klickbares Flussdiagramm
- ⚗️ **Chemikalien im Färbeprozess** mit Risikoeinschätzungen
- 🚢 **Animierter Transportweg** Dhaka → Hamburg → Würzburg
- 💶 **Preisaufteilung** mit interaktivem Hover-Breakdown
- 👗 **Jeans-Anatomie** mit klickbaren Hotspots

## Technologien

- HTML5 / CSS3 (Custom Properties, Grid, Flexbox)
- Vanilla JavaScript (IntersectionObserver, CSS Animations)
- Keine externen Build-Tools nötig

## Struktur

```
jean-claude/
├── index.html          # Hauptseite
├── css/
│   └── style.css       # Alle Styles
├── js/
│   └── main.js         # Interaktivität
├── assets/             # Bilder/Videos (noch einzufügen)
└── README.md
```

## GitHub Pages einrichten

1. Repository auf GitHub erstellen
2. Code hochladen
3. Settings → Pages → Source: `main` Branch, `/` (root)
4. Link erscheint unter `https://[username].github.io/jean-claude/`

## Noch einzufügen (TODO)

- [ ] Echte Bilder in `/assets/` (Vorschläge: Unsplash — Suchbegriffe: *cotton field*, *textile factory*, *denim fabric*, *container ship*)
- [ ] Video-Embeds (optional: YouTube-Links von NGOs)
- [ ] Datawrapper-Grafiken als iframes einbetten
- [ ] Mobile-Optimierung testen und ggf. anpassen

## Datenquellen

- [Clean Clothes Campaign](https://cleanclothes.org) — Arbeitsbedingungen
- [UN Comtrade](https://comtrade.un.org) — Handelsdaten
- [Ellen MacArthur Foundation](https://ellenmacarthurfoundation.org) — A New Textiles Economy (2017)
- Quantis — Measuring Fashion: Environmental Impact Report (2018)
- European Commission JRC — Environmental Improvement Potential of Textiles (2014)

## Farbschema

| Variable | Farbe | Verwendung |
|---|---|---|
| `--navy` | #1a2744 | Primärfarbe, Text |
| `--beige-light` | #f5f0e8 | Hintergrund |
| `--terracotta` | #c0533a | Akzente, Highlights |
| `--sage-dark` | #3d5c38 | Positive Elemente |
| `--amber` | #d4860a | Warnungen |

---

*Modul Interaktive Medien · 2024*
