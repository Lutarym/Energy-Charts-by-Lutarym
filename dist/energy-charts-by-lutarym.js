/**
 * energy-charts-by-lutarym.js
 * Lovelace Custom Card — combined monthly bar charts
 * Covers: self-sufficiency, power consumption, PV yield, wallbox, heat pump, air conditioning
 * Current year + previous year(s) as comparison bars
 *
 * YAML:
 *   type: custom:energy-charts-by-lutarym
 *   card_type: energy      # autarkie | energy | pv | wallbox | wallbox_eff | wp | klima | akku | einspeisung
 *   entity: sensor.xyz     # optional, overrides the preset default
 *   grid_entity: sensor.xyz # required for "wallbox_eff": the grid draw. May be a POWER sensor (W/kW) or an
 *                          # ENERGY sensor (kWh). Power is integrated from its recorded hourly means into
 *                          # monthly import kWh (import only). Monthly efficiency = (1 − grid ÷ entity) × 100
 *                          # on a fixed 0-100 % axis; no grid draw ⇒ 100 %. entity = total charging kWh.
 *                          # No template, no extra sensor — the card converts and computes itself.
 *   title: My Title        # optional, overrides the preset default
 *   color: "#00b4d8"       # optional, overrides the preset default (current year)
 *   color_prev: "#888888"  # optional, overrides the preset default (previous year)
 *   color_text: "#1c1c1c"  # optional, text/value color (default: follows theme)
 *   color_dim: "#00b4d855" # optional, muted color (past months, current year)
 *   appearance: auto       # optional: auto | light | dark
 *   title_font_size: 14    # optional, title font size in px (default: 14)
 *   label_font_size: 10    # optional, chart label font size in px (default: automatic)
 *   years_back: 1           # optional: 0 | 1 | 2 | 3 — additional previous years, 0 = current year only (default: 1)
 *   show_values: true       # optional — the number above each bar (not the axis scale), default: true, applies to all card types
 *   stat_mode: mean         # optional, only for presets with a range option (currently "akku"): mean | minmax
 *                            # "minmax" keeps the bar itself anchored at 0 (height = monthly mean, same as
 *                            # every other card type) and overlays the monthly min/max as a whisker (a
 *                            # vertical line with caps) on the same scale — same axis, no number label.
 *   kwp: 14.4               # optional, only for "pv": installed capacity — dashed reference line on a right-hand kW axis
 *   power_entity: sensor.xyz # optional, only for "pv": instantaneous power sensor (kW/W) — shows the monthly
 *                             # peak (max) as a short tick on top of each bar, on the same right-hand kW axis
 *                             # as kwp. Needs a *separate* entity from the energy sensor above, since power
 *                             # (instantaneous) and energy (cumulative) are different measurements — HA only
 *                             # computes meaningful min/mean/max statistics for the former.
 *   temperature_entity: sensor.aussentemperatur # optional, only for "wp"/"klima": outdoor temperature sensor —
 *                             # draws a connected line (current year only) on its own right-hand °C axis (which,
 *                             # unlike kW, has a real negative-capable min/max range).
 *   temp_mode: daily         # optional, only with temperature_entity set: daily | minmax | mean
 *                             # "daily" is one point per calendar day; auto-degrades to "minmax" (monthly
 *                             # min/max band + mean line) below ~500px card width, then to "mean" (plain
 *                             # monthly average line) below ~280px — no re-fetch needed, computed client-side
 *                             # from the same daily data. "minmax"/"mean" can also be set explicitly.
 *   color_temp: "#0ea5e9"   # optional, temperature line color (default: sky blue)
 *   distance_entity: sensor.auto_odometer # optional, only for "wallbox": odometer/trip sensor — draws a
 *                             # connected line (current year only) for km driven per month, on its own
 *                             # right-hand km axis. Monthly sum (like the wallbox energy sensor itself),
 *                             # not mean/min/max — distance driven doesn't have a meaningful sub-monthly range.
 *   color_distance: "#84cc16" # optional, distance line color (default: lime green)
 *
 * Added via the UI ("Add Card" → "Energy-Charts-by-Lutarym"); the card type
 * plus optional overrides can be chosen conveniently in the visual editor.
 */

const CARD_VERSION = "2.1.0";

// ── Simple i18n helper (falls back to English) ─────────────────────────

const I18N = {
  en: {
    editorCardType: 'Card type',
    rmDefaultTitle: 'Room Energy Consumption',
    rmTotalLabel: 'Total consumption {year}',
    rmRoomsSumLabel: 'Rooms total {year}',
    rmGridLabel: 'Grid import',
    rmPvUsedLabel: 'PV self-used',
    rmOtherLabel: 'Other',
    rmWsError: 'WebSocket error: {msg}',
    rmEditorTotalEntity: 'Total energy entity (optional)',
    rmEditorTotalHint: 'Grid import meter (e.g. OBIS 1.8.0). Leave empty for rooms-only (share of rooms sum, no "Other").',
    rmEditorPvEntity: 'PV yield entity (optional, kWh)',
    rmEditorFeedinEntity: 'Grid feed-in entity (optional, kWh)',
    rmEditorPvHint: 'With both set, real consumption = grid import + (PV yield − feed-in), so "Other" and shares reflect true usage incl. PV.',
    rmRoomsSectionLabel: 'Rooms ({count}/10)',
    rmRoomsHint: 'Up to 10 rooms, each with a freely chosen label and its own energy entity.',
    rmRoomHeaderLabel: 'Room {n}',
    rmRemoveLabel: 'Remove',
    rmNameLabel: 'Name',
    rmNamePlaceholder: 'e.g. Living Room',
    rmEntityLabel: 'Room electricity meter (kWh)',
    rmPowerEntityLabel: 'Live power entity (optional)',
    rmAddRoomLabel: '+ Add room',
    rmAutoLabel: 'Detect rooms automatically',
    rmAutoHint: 'Groups every sensor with device class "energy" that is a real meter by the area it is assigned to in Home Assistant, and replaces the list below. Meters without an area are left out; their consumption shows up in the "Other" row.',
    rmAutoIncludeLabel: 'Only entities containing',
    rmAutoIncludeHint: 'Optional filter on entity ID or name. Leave empty for all.',
    rmAutoExcludeLabel: 'Exclude',
    rmAutoExcludeHint: 'Comma-separated entity IDs or text fragments. The total, PV and feed-in entities above are always excluded, as are daily/monthly/yearly variants of the same meter.',
    rmAutoFound: '{count} entities found',
    rmAutoNone: 'No matching entities found.',
    rmAutoListHidden: 'The manual list is inactive while automatic detection is on.',
    rmAutoMeters: '{count} meters',
    rmAutoNoAreas: 'Areas could not be read, so every meter is its own row.',
    rmColumnsLabel: 'Columns',
    rmColumnsHint: 'Lays the rooms out side by side. Narrow cards automatically fall back to fewer columns.',
    rmColumns1: '1 column',
    rmColumns2: '2 columns',
    rmColumns3: '3 columns',
    ovDefaultTitle: 'Electricity Overview',
    ovNoStatsYet: 'No statistics data available yet.',
    ovWsError: 'WebSocket error: {msg}',
    ovLoadingData: 'Loading data',
    ovCostLabel: 'Electricity cost {year} so far',
    ovEnergyLabel: 'Energy ({kwh} kWh × {price} {currency})',
    ovBaseFeeYear: 'Base fee (year)',
    ovBaseFeeAccrued: 'Base fee (prorated)',
    ovConsumptionLabel: 'Consumption {year}',
    ovPartialYearNote: 'Sensor not present since Jan 1st, consumption since installation.',
    ovPreviousYearLabel: 'Previous year {year} (full)',
    ovVsSamePeriod: 'vs. same period in {year}',
    peakLabel: 'Peak',
    ovLess: 'less',
    ovMore: 'more',
    ovNoDataForYear: 'No data for {year}',
    editorEnergyEntity: 'Electricity meter (kWh, required)',
    editorPrice: 'Price per kWh in EUR (required)',
    editorPriceHint: 'e.g. 0.32 for 32 ct/kWh (EUR per kWh).',
    editorBaseFeeYearly: 'Yearly base fee',
    phBaseFeeYearly: 'e.g. 150',
    phBaseFeeMonthly: 'e.g. 12.50',
    editorBaseFeeMonthly: 'Monthly base fee (alternative)',
    editorBaseFeeMode: 'Base fee mode',
    ovModeAccrued: 'Prorated by day',
    ovModeFull: 'Full yearly fee',
    editorCurrency: 'Currency',
    editorPreviousYear: 'Manual previous-year value (kWh)',
    editorPreviousYearHint: 'Auto-calculated from statistics (previous Jan 1–Dec 31). Leave empty for automatic; a manual value disables the same-period comparison.',
    editorEntity: 'Entity',
    editorEntityHint: 'Optional — default for "{preset}": {entity}',
    editorEntityRequiredHint: 'Required — no default entity, please select one for your setup',
    editorTitle: 'Title',
    editorTitleHint: 'Optional — default: {title}',
    editorTitleFontSize: 'Title font size',
    editorTitleFontSizeHint: 'Default: 14px',
    editorLabelFontSize: 'Label font size',
    editorLabelFontSizeHint: 'Month/axis/value labels — default: automatic',
    editorYearsBack: 'Years back',
    editorYearsBackHint: 'How many past years to show in addition to the current year',
    yearsBack0: 'Current year only (no comparison)',
    yearsBack1: '1 year back (2 years total)',
    yearsBack2: '2 years back (3 years total)',
    yearsBack3: '3 years back (4 years total)',
    editorShowValues: 'Show values in chart',
    editorShowValuesHint: 'The number above each bar — not the axis scale',
    editorShowLegend: 'Legend inside chart',
    editorShowLegendHint: 'Small year swatches in the chart — off by default, the summary line above already shows them',
    editorYMax: 'Axis maximum',
    editorYMaxHint: 'Fixed top value for the Y-axis — leave empty for automatic',
    editorYHeadroom: 'Headroom',
    editorYHeadroomHint: 'Extra space above the highest bar (automatic mode) — default: 20%',
    editorStatMode: 'Display',
    editorStatModeHint: 'How each month is summarized',
    statModeMean: 'Average',
    statModeMinMax: 'Min/max range',
    editorKwp: 'Installed capacity (kWp)',
    editorKwpHint: 'Optional — draws a reference line with its own scale on the right',
    editorPowerEntity: 'Power entity (kW)',
    editorPowerEntityHint: 'Optional — instantaneous power sensor, shows the monthly peak as a marker on each bar',
    editorTemperatureEntity: 'Outdoor temperature entity',
    editorTemperatureEntityHint: 'Optional — shows a line for the outdoor temperature',
    editorTempMode: 'Temperature display',
    editorTempModeHint: 'Daily auto-simplifies to a min/max band, then to a plain average, on narrow cards',
    tempModeDaily: 'Daily',
    tempModeMinMax: 'Monthly min/max range',
    tempModeMean: 'Monthly average',
    editorDistanceEntity: 'Distance driven entity',
    editorDistanceEntityHint: 'Optional — odometer/trip sensor, shows a line for km driven per month',
    editorGridEntity: 'Grid entity (power W/kW or energy kWh)',
    editorGridEntityHint: 'Required — grid draw. Power is integrated to monthly import kWh. Efficiency = (1 − grid ÷ charging) × 100',
    editorFeedinEntity: 'Grid feed-in entity (kWh)',
    editorFeedinEntityHint: 'Required — PV energy exported to grid. Self-consumption = (PV − feed-in) ÷ PV × 100',
    editorHeatEntity: 'Heat produced entity (kWh)',
    editorHeatEntityHint: 'Required — thermal energy produced. COP = heat ÷ electricity',
    sectionColors: 'Colors',
    colorCurrentYear: 'Current year',
    colorCurrentYearHint: 'Default for "{preset}": {color}',
    colorPreviousYears: 'Previous year(s)',
    colorPreviousYearsHint: 'Default: {color}',
    colorTextValues: 'Text / values',
    colorTextValuesHint: 'Default: follows dashboard theme',
    colorDimLabel: 'Muted color',
    colorDimHint: 'Past months, current year — default: automatically derived from the main color',
    editorAppearance: 'Appearance',
    editorAppearanceHint: 'Automatic follows the dashboard theme; light/dark forces fixed colors for this card only',
    appearanceAuto: 'Automatic (dashboard theme)',
    appearanceLight: 'Force light',
    appearanceDark: 'Force dark',
    resetLabel: 'Reset',
    autoLabel: 'Automatic',
    loading: 'Loading data…',
    notConfigured: 'Select an entity in the card editor to get started.',
    notConfiguredRatio: 'Also select "{field}" in the card editor to get started.',
    error: 'Error: {msg}',
    unknownError: 'Unknown error',
    unitKwp: 'kWp',
  },
  de: {
    editorCardType: 'Kartentyp',
    rmDefaultTitle: 'Stromverbrauch Räume',
    rmTotalLabel: 'Gesamtverbrauch {year}',
    rmRoomsSumLabel: 'Summe Räume {year}',
    rmGridLabel: 'Netzbezug',
    rmPvUsedLabel: 'PV-Eigenverbrauch',
    rmOtherLabel: 'Sonstige',
    rmWsError: 'WebSocket-Fehler: {msg}',
    rmEditorTotalEntity: 'Gesamt-Energie-Entity (optional)',
    rmEditorTotalHint: 'Netzbezugs-Zähler (z. B. OBIS 1.8.0). Leer lassen = nur Räume (Anteil an Raum-Summe, kein "Sonstiges").',
    rmEditorPvEntity: 'PV-Ertrag-Entity (optional, kWh)',
    rmEditorFeedinEntity: 'Netz-Einspeisung-Entity (optional, kWh)',
    rmEditorPvHint: 'Beide gesetzt: echter Verbrauch = Netzbezug + (PV-Ertrag − Einspeisung). "Sonstiges" und Anteile berücksichtigen dann auch den PV-Eigenverbrauch.',
    rmRoomsSectionLabel: 'Räume ({count}/10)',
    rmRoomsHint: 'Bis zu 10 Räume, jeweils mit frei wählbarer Beschriftung und zugehöriger Energie-Entity.',
    rmRoomHeaderLabel: 'Raum {n}',
    rmRemoveLabel: 'Entfernen',
    rmNameLabel: 'Name',
    rmNamePlaceholder: 'z.B. Wohnzimmer',
    rmEntityLabel: 'Stromzähler des Raums (kWh)',
    rmPowerEntityLabel: 'Live-Leistung-Entity (optional)',
    rmAddRoomLabel: '+ Raum hinzufügen',
    rmAutoLabel: 'Räume automatisch erkennen',
    rmAutoHint: 'Gruppiert jeden Sensor mit Geräteklasse "energy", der ein echter Zähler ist, nach dem Bereich, dem er in Home Assistant zugeordnet ist, und ersetzt damit die Liste unten. Zähler ohne Bereich bleiben außen vor; ihr Verbrauch erscheint in der Zeile "Sonstige".',
    rmAutoIncludeLabel: 'Nur Entities, die enthalten',
    rmAutoIncludeHint: 'Optionaler Filter auf Entity-ID oder Name. Leer lassen für alle.',
    rmAutoExcludeLabel: 'Ausschließen',
    rmAutoExcludeHint: 'Kommagetrennte Entity-IDs oder Textteile. Die Gesamt-, PV- und Einspeise-Entity oben sind immer ausgeschlossen, ebenso Tages-, Monats- und Jahresvarianten desselben Zählers.',
    rmAutoFound: '{count} Entities gefunden',
    rmAutoNone: 'Keine passenden Entities gefunden.',
    rmAutoListHidden: 'Die manuelle Liste ist inaktiv, solange die automatische Erkennung an ist.',
    rmAutoMeters: '{count} Zähler',
    rmAutoNoAreas: 'Die Bereiche waren nicht lesbar, deshalb ist jeder Zähler eine eigene Zeile.',
    rmColumnsLabel: 'Spalten',
    rmColumnsHint: 'Ordnet die Räume nebeneinander an. Schmale Karten fallen automatisch auf weniger Spalten zurück.',
    rmColumns1: '1 Spalte',
    rmColumns2: '2 Spalten',
    rmColumns3: '3 Spalten',
    ovDefaultTitle: 'Stromübersicht',
    ovNoStatsYet: 'Noch keine Statistikdaten vorhanden.',
    ovWsError: 'WebSocket-Fehler: {msg}',
    ovLoadingData: 'Lade Daten',
    ovCostLabel: 'Stromkosten {year} bisher',
    ovEnergyLabel: 'Energie ({kwh} kWh × {price} {currency})',
    ovBaseFeeYear: 'Grundgebühr (Jahr)',
    ovBaseFeeAccrued: 'Grundgebühr (anteilig)',
    ovConsumptionLabel: 'Verbrauch {year}',
    ovPartialYearNote: 'Sensor nicht seit 1.1. vorhanden, Verbrauch ab Einbau.',
    ovPreviousYearLabel: 'Vorjahr {year} (gesamt)',
    ovVsSamePeriod: 'ggü. gleichem Zeitraum {year}',
    peakLabel: 'Spitze',
    ovLess: 'weniger',
    ovMore: 'mehr',
    ovNoDataForYear: 'Keine Daten für {year}',
    editorEnergyEntity: 'Stromverbrauch-Zähler (kWh, Pflicht)',
    editorPrice: 'Preis pro kWh in EUR (Pflicht)',
    editorPriceHint: 'z. B. 0.32 für 32 ct/kWh (Euro pro kWh).',
    editorBaseFeeYearly: 'Grundgebühr jährlich',
    phBaseFeeYearly: 'z. B. 150',
    phBaseFeeMonthly: 'z. B. 12,50',
    editorBaseFeeMonthly: 'Grundgebühr monatlich (Alternative)',
    editorBaseFeeMode: 'Grundgebühr-Modus',
    ovModeAccrued: 'Tagesanteilig',
    ovModeFull: 'Volle Jahresgebühr',
    editorCurrency: 'Währung',
    editorPreviousYear: 'Manueller Vorjahreswert (kWh)',
    editorPreviousYearHint: 'Wird automatisch aus der Statistik berechnet (1.1.–31.12. Vorjahr). Leer lassen für automatisch; ein manueller Wert deaktiviert den Zeitraumvergleich.',
    editorEntity: 'Entity',
    editorEntityHint: 'Optional — Standard für "{preset}": {entity}',
    editorEntityRequiredHint: 'Erforderlich — keine Standard-Entity, bitte eine für deine Anlage auswählen',
    editorTitle: 'Titel',
    editorTitleHint: 'Optional — Standard: {title}',
    editorTitleFontSize: 'Schriftgröße Titel',
    editorTitleFontSizeHint: 'Standard: 14px',
    editorLabelFontSize: 'Schriftgröße Beschriftung',
    editorLabelFontSizeHint: 'Monats-/Achsen-/Wertebeschriftung — Standard: automatisch',
    editorYearsBack: 'Jahre zurück',
    editorYearsBackHint: 'Wie viele vergangene Jahre zusätzlich zum aktuellen Jahr angezeigt werden',
    yearsBack0: 'Nur aktuelles Jahr (kein Vergleich)',
    yearsBack1: '1 Jahr zurück (2 Jahre gesamt)',
    yearsBack2: '2 Jahre zurück (3 Jahre gesamt)',
    yearsBack3: '3 Jahre zurück (4 Jahre gesamt)',
    editorShowValues: 'Zahlenwerte im Diagramm anzeigen',
    editorShowValuesHint: 'Die Zahl über jedem Balken — nicht die Achsen-Skala',
    editorShowLegend: 'Legende im Diagramm',
    editorShowLegendHint: 'Kleine Jahres-Marker im Diagramm — Standard aus, die Summenzeile oben zeigt sie bereits',
    editorYMax: 'Achsen-Maximum',
    editorYMaxHint: 'Fester oberer Wert der Y-Achse — leer lassen für automatisch',
    editorYHeadroom: 'Kopffreiheit',
    editorYHeadroomHint: 'Zusätzlicher Platz über dem höchsten Balken (Automatik-Modus) — Standard: 20%',
    editorStatMode: 'Darstellung',
    editorStatModeHint: 'Wie jeder Monat zusammengefasst wird',
    statModeMean: 'Durchschnitt',
    statModeMinMax: 'Min/Max-Bereich',
    editorKwp: 'Installierte Leistung (kWp)',
    editorKwpHint: 'Optional — zeichnet eine Referenzlinie mit eigener Skala rechts',
    editorPowerEntity: 'Leistungs-Entity (kW)',
    editorPowerEntityHint: 'Optional — Momentanleistungs-Sensor, zeigt die monatliche Spitze als Markierung auf jedem Balken',
    editorTemperatureEntity: 'Außentemperatur-Entity',
    editorTemperatureEntityHint: 'Optional — zeigt eine Linie für die Außentemperatur',
    editorTempMode: 'Temperatur-Darstellung',
    editorTempModeHint: 'Täglich vereinfacht sich bei schmalen Karten automatisch zu Min/Max, dann zum reinen Durchschnitt',
    tempModeDaily: 'Täglich',
    tempModeMinMax: 'Monatlicher Min/Max-Bereich',
    tempModeMean: 'Monatlicher Durchschnitt',
    editorDistanceEntity: 'Kilometer-Entity',
    editorDistanceEntityHint: 'Optional — Kilometerstand-/Fahrten-Sensor, zeigt eine Linie für gefahrene km pro Monat',
    editorGridEntity: 'Netz-Entity (Leistung W/kW oder Energie kWh)',
    editorGridEntityHint: 'Erforderlich — Netzbezug. Leistung wird zu Monats-kWh integriert. Effizienz = (1 − Netz ÷ Ladung) × 100',
    editorFeedinEntity: 'Netz-Einspeisung-Entity (kWh)',
    editorFeedinEntityHint: 'Erforderlich — ins Netz eingespeiste PV-Energie. Eigenverbrauch = (PV − Einspeisung) ÷ PV × 100',
    editorHeatEntity: 'Wärmemengen-Entity (kWh)',
    editorHeatEntityHint: 'Erforderlich — erzeugte thermische Energie. COP = Wärme ÷ Strom',
    sectionColors: 'Farben',
    colorCurrentYear: 'Aktuelles Jahr',
    colorCurrentYearHint: 'Standard für "{preset}": {color}',
    colorPreviousYears: 'Vorjahr(e)',
    colorPreviousYearsHint: 'Standard: {color}',
    colorTextValues: 'Text / Werte',
    colorTextValuesHint: 'Standard: folgt Dashboard-Theme',
    colorDimLabel: 'Schwächerer Farbton',
    colorDimHint: 'Vergangene Monate, aktuelles Jahr — Standard: automatisch aus Hauptfarbe',
    editorAppearance: 'Darstellung',
    editorAppearanceHint: 'Automatisch folgt dem Dashboard-Theme; Hell/Dunkel erzwingt feste Farben nur für diese Karte',
    appearanceAuto: 'Automatisch (Dashboard-Theme)',
    appearanceLight: 'Hell erzwingen',
    appearanceDark: 'Dunkel erzwingen',
    resetLabel: 'Zurücksetzen',
    autoLabel: 'Automatisch',
    loading: 'Lade Daten…',
    notConfigured: 'Wähle im Karten-Editor eine Entity aus, um zu starten.',
    notConfiguredRatio: 'Wähle im Karten-Editor zusätzlich "{field}" aus, um zu starten.',
    error: 'Fehler: {msg}',
    unknownError: 'Unbekannter Fehler',
    unitKwp: 'kWp',
  },
  fr: {
    editorCardType: 'Type de carte',
    rmDefaultTitle: 'Consommation par pièce',
    rmTotalLabel: 'Consommation totale {year}',
    rmRoomsSumLabel: 'Total des pièces {year}',
    rmGridLabel: 'Soutirage réseau',
    rmPvUsedLabel: 'PV autoconsommé',
    rmOtherLabel: 'Autres',
    rmWsError: 'Erreur WebSocket : {msg}',
    rmEditorTotalEntity: 'Entité énergie totale (facultatif)',
    rmEditorTotalHint: 'Compteur de soutirage réseau (p. ex. OBIS 1.8.0). Laisser vide pour n\'afficher que les pièces (part du total des pièces, sans « Autres »).',
    rmEditorPvEntity: 'Entité production PV (facultatif, kWh)',
    rmEditorFeedinEntity: 'Entité injection réseau (facultatif, kWh)',
    rmEditorPvHint: 'Les deux renseignées : consommation réelle = soutirage + (production PV − injection). « Autres » et les parts tiennent alors compte de l\'autoconsommation PV.',
    rmRoomsSectionLabel: 'Pièces ({count}/10)',
    rmRoomsHint: 'Jusqu\'à 10 pièces, chacune avec un libellé libre et sa propre entité d\'énergie.',
    rmRoomHeaderLabel: 'Pièce {n}',
    rmRemoveLabel: 'Supprimer',
    rmNameLabel: 'Nom',
    rmNamePlaceholder: 'p. ex. Salon',
    rmEntityLabel: 'Compteur électrique de la pièce (kWh)',
    rmPowerEntityLabel: 'Entité puissance instantanée (facultatif)',
    rmAddRoomLabel: '+ Ajouter une pièce',
    rmAutoLabel: 'Détecter les pièces automatiquement',
    rmAutoHint: 'Regroupe chaque capteur de classe « energy » qui est un vrai compteur selon la zone à laquelle il est rattaché dans Home Assistant, et remplace la liste ci-dessous. Les compteurs sans zone sont écartés ; leur consommation apparaît dans la ligne « Autres ».',
    rmAutoIncludeLabel: 'Seulement les entités contenant',
    rmAutoIncludeHint: 'Filtre facultatif sur l\'identifiant ou le nom de l\'entité. Laisser vide pour toutes.',
    rmAutoExcludeLabel: 'Exclure',
    rmAutoExcludeHint: 'Identifiants d\'entité ou fragments de texte séparés par des virgules. Les entités total, PV et injection ci-dessus sont toujours exclues, ainsi que les variantes journalières, mensuelles et annuelles du même compteur.',
    rmAutoFound: '{count} entités trouvées',
    rmAutoNone: 'Aucune entité correspondante trouvée.',
    rmAutoListHidden: 'La liste manuelle est inactive tant que la détection automatique est active.',
    rmAutoMeters: '{count} compteurs',
    rmAutoNoAreas: 'Les zones n\'ont pas pu être lues, chaque compteur forme donc sa propre ligne.',
    rmColumnsLabel: 'Colonnes',
    rmColumnsHint: 'Dispose les pièces côte à côte. Les cartes étroites reviennent automatiquement à moins de colonnes.',
    rmColumns1: '1 colonne',
    rmColumns2: '2 colonnes',
    rmColumns3: '3 colonnes',
    ovDefaultTitle: 'Aperçu électricité',
    ovNoStatsYet: 'Aucune donnée statistique disponible pour le moment.',
    ovWsError: 'Erreur WebSocket : {msg}',
    ovLoadingData: 'Chargement des données',
    ovCostLabel: 'Coût de l\'électricité {year} à ce jour',
    ovEnergyLabel: 'Énergie ({kwh} kWh × {price} {currency})',
    ovBaseFeeYear: 'Abonnement (année)',
    ovBaseFeeAccrued: 'Abonnement (au prorata)',
    ovConsumptionLabel: 'Consommation {year}',
    ovPartialYearNote: 'Capteur absent depuis le 1er janvier, consommation depuis l\'installation.',
    ovPreviousYearLabel: 'Année précédente {year} (total)',
    ovVsSamePeriod: 'par rapport à la même période en {year}',
    peakLabel: 'Pointe',
    ovLess: 'de moins',
    ovMore: 'de plus',
    ovNoDataForYear: 'Aucune donnée pour {year}',
    editorEnergyEntity: 'Compteur électrique (kWh, requis)',
    editorPrice: 'Prix du kWh en EUR (requis)',
    editorPriceHint: 'p. ex. 0.32 pour 32 ct/kWh (euros par kWh).',
    editorBaseFeeYearly: 'Abonnement annuel',
    phBaseFeeYearly: 'p. ex. 150',
    phBaseFeeMonthly: 'p. ex. 12,50',
    editorBaseFeeMonthly: 'Abonnement mensuel (alternative)',
    editorBaseFeeMode: 'Mode de l\'abonnement',
    ovModeAccrued: 'Au prorata des jours',
    ovModeFull: 'Montant annuel complet',
    editorCurrency: 'Devise',
    editorPreviousYear: 'Valeur manuelle année précédente (kWh)',
    editorPreviousYearHint: 'Calculée automatiquement à partir des statistiques (1er janvier au 31 décembre précédent). Laisser vide pour le calcul automatique ; une valeur manuelle désactive la comparaison sur la même période.',
    editorEntity: 'Entité',
    editorEntityHint: 'Facultatif — valeur par défaut pour « {preset} » : {entity}',
    editorEntityRequiredHint: 'Requis — aucune entité par défaut, choisissez celle de votre installation',
    editorTitle: 'Titre',
    editorTitleHint: 'Facultatif — par défaut : {title}',
    editorTitleFontSize: 'Taille du titre',
    editorTitleFontSizeHint: 'Par défaut : 14px',
    editorLabelFontSize: 'Taille des libellés',
    editorLabelFontSizeHint: 'Libellés des mois, des axes et des valeurs — par défaut : automatique',
    editorYearsBack: 'Années précédentes',
    editorYearsBackHint: 'Nombre d\'années passées affichées en plus de l\'année en cours',
    yearsBack0: 'Année en cours uniquement (sans comparaison)',
    yearsBack1: '1 année précédente (2 années au total)',
    yearsBack2: '2 années précédentes (3 années au total)',
    yearsBack3: '3 années précédentes (4 années au total)',
    editorShowValues: 'Afficher les valeurs dans le graphique',
    editorShowValuesHint: 'Le nombre au-dessus de chaque barre — pas la graduation de l\'axe',
    editorShowLegend: 'Légende dans le graphique',
    editorShowLegendHint: 'Petits repères d\'année dans le graphique — désactivé par défaut, la ligne de synthèse au-dessus les affiche déjà',
    editorYMax: 'Maximum de l\'axe',
    editorYMaxHint: 'Valeur haute fixe de l\'axe Y — laisser vide pour automatique',
    editorYHeadroom: 'Marge haute',
    editorYHeadroomHint: 'Espace supplémentaire au-dessus de la barre la plus haute (mode automatique) — par défaut : 20%',
    editorStatMode: 'Affichage',
    editorStatModeHint: 'Comment chaque mois est résumé',
    statModeMean: 'Moyenne',
    statModeMinMax: 'Plage min/max',
    editorKwp: 'Puissance installée (kWc)',
    editorKwpHint: 'Facultatif — trace une ligne de référence avec sa propre échelle à droite',
    editorPowerEntity: 'Entité puissance (kW)',
    editorPowerEntityHint: 'Facultatif — capteur de puissance instantanée, affiche la pointe mensuelle sous forme de repère sur chaque barre',
    editorTemperatureEntity: 'Entité température extérieure',
    editorTemperatureEntityHint: 'Facultatif — affiche une courbe de la température extérieure',
    editorTempMode: 'Affichage de la température',
    editorTempModeHint: 'Le mode quotidien se simplifie automatiquement en plage min/max, puis en simple moyenne, sur les cartes étroites',
    tempModeDaily: 'Quotidien',
    tempModeMinMax: 'Plage min/max mensuelle',
    tempModeMean: 'Moyenne mensuelle',
    editorDistanceEntity: 'Entité kilométrage',
    editorDistanceEntityHint: 'Facultatif — compteur kilométrique ou capteur de trajet, affiche une courbe des km parcourus par mois',
    editorGridEntity: 'Entité réseau (puissance W/kW ou énergie kWh)',
    editorGridEntityHint: 'Requis — soutirage réseau. La puissance est intégrée en kWh mensuels. Efficacité = (1 − réseau ÷ charge) × 100',
    editorFeedinEntity: 'Entité injection réseau (kWh)',
    editorFeedinEntityHint: 'Requis — énergie PV injectée sur le réseau. Autoconsommation = (PV − injection) ÷ PV × 100',
    editorHeatEntity: 'Entité énergie thermique produite (kWh)',
    editorHeatEntityHint: 'Requis — énergie thermique produite. COP = chaleur ÷ électricité',
    sectionColors: 'Couleurs',
    colorCurrentYear: 'Année en cours',
    colorCurrentYearHint: 'Par défaut pour « {preset} » : {color}',
    colorPreviousYears: 'Année(s) précédente(s)',
    colorPreviousYearsHint: 'Par défaut : {color}',
    colorTextValues: 'Texte / valeurs',
    colorTextValuesHint: 'Par défaut : suit le thème du tableau de bord',
    colorDimLabel: 'Couleur atténuée',
    colorDimHint: 'Mois écoulés de l\'année en cours — par défaut : dérivée automatiquement de la couleur principale',
    editorAppearance: 'Apparence',
    editorAppearanceHint: 'Automatique suit le thème du tableau de bord ; clair/sombre impose des couleurs fixes pour cette carte uniquement',
    appearanceAuto: 'Automatique (thème du tableau de bord)',
    appearanceLight: 'Forcer le clair',
    appearanceDark: 'Forcer le sombre',
    resetLabel: 'Réinitialiser',
    autoLabel: 'Automatique',
    loading: 'Chargement des données…',
    notConfigured: 'Sélectionnez une entité dans l\'éditeur de carte pour commencer.',
    notConfiguredRatio: 'Sélectionnez également « {field} » dans l\'éditeur de carte pour commencer.',
    error: 'Erreur : {msg}',
    unknownError: 'Erreur inconnue',
    unitKwp: 'kWc',
  },
  ja: {
    editorCardType: 'カードの種類',
    rmDefaultTitle: '部屋別の電力使用量',
    rmTotalLabel: '{year}年の総使用量',
    rmRoomsSumLabel: '{year}年の部屋合計',
    rmGridLabel: '系統からの購入電力',
    rmPvUsedLabel: '太陽光の自家消費',
    rmOtherLabel: 'その他',
    rmWsError: 'WebSocketエラー：{msg}',
    rmEditorTotalEntity: '全体の電力量エンティティ（任意）',
    rmEditorTotalHint: '系統購入電力のメーター（例：OBIS 1.8.0）。空欄の場合は部屋のみを表示します（部屋合計に対する割合、「その他」なし）。',
    rmEditorPvEntity: '太陽光発電量エンティティ（任意、kWh）',
    rmEditorFeedinEntity: '系統への売電エンティティ（任意、kWh）',
    rmEditorPvHint: '両方を設定すると、実使用量 = 購入電力 +（太陽光発電量 − 売電）となり、「その他」と割合に自家消費分が反映されます。',
    rmRoomsSectionLabel: '部屋（{count}/10）',
    rmRoomsHint: '最大10部屋。それぞれ自由な名前と専用の電力量エンティティを設定できます。',
    rmRoomHeaderLabel: '部屋 {n}',
    rmRemoveLabel: '削除',
    rmNameLabel: '名前',
    rmNamePlaceholder: '例：リビング',
    rmEntityLabel: '部屋の電力量計（kWh）',
    rmPowerEntityLabel: '現在の消費電力エンティティ（任意）',
    rmAddRoomLabel: '＋ 部屋を追加',
    rmAutoLabel: '部屋を自動的に検出',
    rmAutoHint: 'デバイスクラスが「energy」で実際の積算計であるセンサーを、Home Assistant で割り当てられたエリアごとにまとめ、下のリストを置き換えます。エリアが未設定の計器は対象外で、その使用量は「その他」の行に含まれます。',
    rmAutoIncludeLabel: '次を含むエンティティのみ',
    rmAutoIncludeHint: 'エンティティIDまたは名前に対する任意のフィルターです。空欄ですべてが対象になります。',
    rmAutoExcludeLabel: '除外',
    rmAutoExcludeHint: 'エンティティIDまたは文字列をカンマ区切りで指定します。上の全体・太陽光・売電のエンティティ、および同じ計器の日次・月次・年次の派生は常に除外されます。',
    rmAutoFound: '{count} 件のエンティティが見つかりました',
    rmAutoNone: '該当するエンティティが見つかりません。',
    rmAutoListHidden: '自動検出が有効な間、手動のリストは使われません。',
    rmAutoMeters: '計器 {count} 台',
    rmAutoNoAreas: 'エリアを読み取れなかったため、各計器がそれぞれ1行になります。',
    rmColumnsLabel: '列数',
    rmColumnsHint: '部屋を横に並べます。幅の狭いカードでは自動的に列数が減ります。',
    rmColumns1: '1列',
    rmColumns2: '2列',
    rmColumns3: '3列',
    ovDefaultTitle: '電力概要',
    ovNoStatsYet: '統計データがまだありません。',
    ovWsError: 'WebSocketエラー：{msg}',
    ovLoadingData: 'データを読み込み中',
    ovCostLabel: '{year}年のこれまでの電気代',
    ovEnergyLabel: '電力量（{kwh} kWh × {price} {currency}）',
    ovBaseFeeYear: '基本料金（年額）',
    ovBaseFeeAccrued: '基本料金（日割り）',
    ovConsumptionLabel: '{year}年の使用量',
    ovPartialYearNote: '1月1日からのセンサーデータがないため、設置以降の使用量です。',
    ovPreviousYearLabel: '前年 {year}（通年）',
    ovVsSamePeriod: '{year}年の同時期との比較',
    peakLabel: 'ピーク',
    ovLess: '少ない',
    ovMore: '多い',
    ovNoDataForYear: '{year}年のデータがありません',
    editorEnergyEntity: '電力量計（kWh、必須）',
    editorPrice: 'kWhあたりの単価（EUR、必須）',
    editorPriceHint: '例：32 ct/kWh なら 0.32（kWhあたりのユーロ）。',
    editorBaseFeeYearly: '基本料金（年額）',
    phBaseFeeYearly: '例：150',
    phBaseFeeMonthly: '例：12.50',
    editorBaseFeeMonthly: '基本料金（月額、いずれか一方）',
    editorBaseFeeMode: '基本料金の計算方法',
    ovModeAccrued: '日割り計算',
    ovModeFull: '年額をそのまま',
    editorCurrency: '通貨',
    editorPreviousYear: '前年値の手動入力（kWh）',
    editorPreviousYearHint: '通常は統計から自動計算します（前年1月1日から12月31日）。空欄で自動。手動で入力すると同時期との比較は無効になります。',
    editorEntity: 'エンティティ',
    editorEntityHint: '任意。「{preset}」の既定値：{entity}',
    editorEntityRequiredHint: '必須。既定のエンティティはありません。ご自身の設備のものを選択してください',
    editorTitle: 'タイトル',
    editorTitleHint: '任意。既定値：{title}',
    editorTitleFontSize: 'タイトルの文字サイズ',
    editorTitleFontSizeHint: '既定値：14px',
    editorLabelFontSize: 'ラベルの文字サイズ',
    editorLabelFontSizeHint: '月・軸・数値のラベル。既定値は自動',
    editorYearsBack: 'さかのぼる年数',
    editorYearsBackHint: '本年に加えて表示する過去の年数',
    yearsBack0: '本年のみ（比較なし）',
    yearsBack1: '1年前まで（計2年）',
    yearsBack2: '2年前まで（計3年）',
    yearsBack3: '3年前まで（計4年）',
    editorShowValues: 'グラフに数値を表示',
    editorShowValuesHint: '各バーの上の数値。軸の目盛りではありません',
    editorShowLegend: 'グラフ内に凡例',
    editorShowLegendHint: 'グラフ内の小さな年マーカー。既定はオフで、上の集計行にすでに表示されています',
    editorYMax: '軸の最大値',
    editorYMaxHint: 'Y軸の上限を固定します。空欄で自動',
    editorYHeadroom: '上の余白',
    editorYHeadroomHint: '最も高いバーの上に確保する余白（自動モード）。既定値：20%',
    editorStatMode: '表示方法',
    editorStatModeHint: '各月をどのようにまとめるか',
    statModeMean: '平均',
    statModeMinMax: '最小／最大の範囲',
    editorKwp: '設置容量（kWp）',
    editorKwpHint: '任意。右側に専用の目盛り付きの基準線を描きます',
    editorPowerEntity: '電力エンティティ（kW）',
    editorPowerEntityHint: '任意。瞬時電力センサー。月間ピークを各バーの目印として表示します',
    editorTemperatureEntity: '外気温エンティティ',
    editorTemperatureEntityHint: '任意。外気温の折れ線を表示します',
    editorTempMode: '気温の表示',
    editorTempModeHint: '「日ごと」は幅の狭いカードでは自動的に最小／最大、さらに単純平均へ簡略化されます',
    tempModeDaily: '日ごと',
    tempModeMinMax: '月間の最小／最大',
    tempModeMean: '月間平均',
    editorDistanceEntity: '走行距離エンティティ',
    editorDistanceEntityHint: '任意。オドメーターまたは走行距離センサー。月ごとの走行距離を折れ線で表示します',
    editorGridEntity: '系統エンティティ（電力 W/kW または電力量 kWh）',
    editorGridEntityHint: '必須。系統からの購入電力。電力は月間kWhに積算されます。効率 =（1 − 系統 ÷ 充電）× 100',
    editorFeedinEntity: '系統への売電エンティティ（kWh）',
    editorFeedinEntityHint: '必須。系統に売電した太陽光の電力量。自家消費率 =（太陽光 − 売電）÷ 太陽光 × 100',
    editorHeatEntity: '発生熱量エンティティ（kWh）',
    editorHeatEntityHint: '必須。発生した熱エネルギー。COP = 熱量 ÷ 電力量',
    sectionColors: '色',
    colorCurrentYear: '本年',
    colorCurrentYearHint: '「{preset}」の既定値：{color}',
    colorPreviousYears: '前年以前',
    colorPreviousYearsHint: '既定値：{color}',
    colorTextValues: '文字／数値',
    colorTextValuesHint: '既定ではダッシュボードのテーマに従います',
    colorDimLabel: '控えめな色',
    colorDimHint: '本年の過ぎた月。既定ではメインカラーから自動的に導かれます',
    editorAppearance: '外観',
    editorAppearanceHint: '「自動」はダッシュボードのテーマに従います。ライト／ダークはこのカードだけ色を固定します',
    appearanceAuto: '自動（ダッシュボードのテーマ）',
    appearanceLight: 'ライトに固定',
    appearanceDark: 'ダークに固定',
    resetLabel: 'リセット',
    autoLabel: '自動',
    loading: 'データを読み込み中…',
    notConfigured: 'カードエディターでエンティティを選択してください。',
    notConfiguredRatio: 'カードエディターで「{field}」も選択してください。',
    error: 'エラー：{msg}',
    unknownError: '不明なエラー',
    unitKwp: 'kWp',
  },
};

// Preset display names/titles per language — kept separate from PRESETS
// (below) so the preset data itself stays language-independent.
const PRESET_I18N = {
  en: {
    autarkie: { label: 'Self-Sufficiency', title: 'Self-Sufficiency', entityDesc: 'Self-sufficiency sensor (%)' },
    energy:   { label: 'Power Consumption', title: 'Power Consumption', entityDesc: 'Power consumption meter (kWh)' },
    pv:       { label: 'PV Yield', title: 'PV Yield', entityDesc: 'PV yield meter (kWh)' },
    wallbox:  { label: 'Wallbox', title: 'Wallbox', entityDesc: 'Wallbox charging energy meter (kWh)' },
    wallbox_eff: { label: 'Wallbox Charging Efficiency', title: 'Wallbox Charging Efficiency', entityDesc: 'Wallbox charging energy meter (kWh)' },
    eigenverbrauch: { label: 'Self-Consumption', title: 'Self-Consumption', entityDesc: 'PV yield meter (kWh)' },
    cop: { label: 'Heat Pump COP', title: 'Heat Pump COP', entityDesc: 'Heat pump electricity meter (kWh)' },
    wp:       { label: 'Heat Pump', title: 'Heat Pump', entityDesc: 'Heat pump electricity meter (kWh)' },
    klima:    { label: 'Air Conditioning', title: 'Air Conditioning', entityDesc: 'Air conditioning electricity meter (kWh)' },
    akku:     { label: 'Battery State of Charge', title: 'Battery State of Charge', entityDesc: 'Battery charge sensor (%)' },
    einspeisung: { label: 'Grid Feed-in', title: 'Grid Feed-in', entityDesc: 'Grid feed-in meter (kWh)' },
    overview: { label: 'Electricity Overview', title: 'Electricity Overview' },
    rooms: { label: 'Room Energy', title: 'Room Energy Consumption' },
  },
  de: {
    autarkie: { label: 'Autarkie', title: 'Autarkie', entityDesc: 'Autarkiegrad-Sensor (%)' },
    energy:   { label: 'Stromverbrauch', title: 'Stromverbrauch', entityDesc: 'Stromverbrauch-Zähler (kWh)' },
    pv:       { label: 'PV Ertrag', title: 'PV Ertrag', entityDesc: 'PV-Ertrag-Zähler (kWh)' },
    wallbox:  { label: 'Wallbox', title: 'Wallbox', entityDesc: 'Wallbox-Ladeenergie-Zähler (kWh)' },
    wallbox_eff: { label: 'Wallbox Ladeeffizienz', title: 'Wallbox Ladeeffizienz', entityDesc: 'Wallbox-Ladeenergie-Zähler (kWh)' },
    eigenverbrauch: { label: 'Eigenverbrauchsquote', title: 'Eigenverbrauchsquote', entityDesc: 'PV-Ertrag-Zähler (kWh)' },
    cop: { label: 'Wärmepumpe COP', title: 'Wärmepumpe COP', entityDesc: 'Stromzähler Wärmepumpe (kWh)' },
    wp:       { label: 'Wärmepumpe', title: 'Wärmepumpe', entityDesc: 'Stromzähler Wärmepumpe (kWh)' },
    klima:    { label: 'Klimaanlage', title: 'Klimaanlage', entityDesc: 'Stromzähler Klimaanlage (kWh)' },
    akku:     { label: 'Akku-Ladezustand', title: 'Akku-Ladezustand', entityDesc: 'Akku-Ladezustand-Sensor (%)' },
    einspeisung: { label: 'Netzeinspeisung', title: 'PV Netz-Einspeisung', entityDesc: 'Netzeinspeisung-Zähler (kWh)' },
    overview: { label: 'Stromübersicht', title: 'Stromübersicht' },
    rooms: { label: 'Raum-Energie', title: 'Stromverbrauch Räume' },
  },
  fr: {
    autarkie: { label: 'Autonomie', title: 'Autonomie', entityDesc: 'Capteur de taux d\'autonomie (%)' },
    energy:   { label: 'Consommation électrique', title: 'Consommation électrique', entityDesc: 'Compteur de consommation (kWh)' },
    pv:       { label: 'Production PV', title: 'Production PV', entityDesc: 'Compteur de production PV (kWh)' },
    wallbox:  { label: 'Borne de recharge', title: 'Borne de recharge', entityDesc: 'Compteur d\'énergie de la borne (kWh)' },
    wallbox_eff: { label: 'Efficacité de charge', title: 'Efficacité de charge', entityDesc: 'Compteur d\'énergie de la borne (kWh)' },
    eigenverbrauch: { label: 'Autoconsommation', title: 'Autoconsommation', entityDesc: 'Compteur de production PV (kWh)' },
    cop: { label: 'COP pompe à chaleur', title: 'COP pompe à chaleur', entityDesc: 'Compteur électrique de la pompe à chaleur (kWh)' },
    wp:       { label: 'Pompe à chaleur', title: 'Pompe à chaleur', entityDesc: 'Compteur électrique de la pompe à chaleur (kWh)' },
    klima:    { label: 'Climatisation', title: 'Climatisation', entityDesc: 'Compteur électrique de la climatisation (kWh)' },
    akku:     { label: 'État de charge batterie', title: 'État de charge batterie', entityDesc: 'Capteur d\'état de charge (%)' },
    einspeisung: { label: 'Injection réseau', title: 'Injection réseau PV', entityDesc: 'Compteur d\'injection réseau (kWh)' },
    overview: { label: 'Aperçu électricité', title: 'Aperçu électricité' },
    rooms: { label: 'Énergie par pièce', title: 'Consommation par pièce' },
  },
  ja: {
    autarkie: { label: '自給率', title: '自給率', entityDesc: '自給率センサー（%）' },
    energy:   { label: '電力使用量', title: '電力使用量', entityDesc: '電力量計（kWh）' },
    pv:       { label: '太陽光発電量', title: '太陽光発電量', entityDesc: '太陽光発電量計（kWh）' },
    wallbox:  { label: 'EV充電器', title: 'EV充電器', entityDesc: 'EV充電の電力量計（kWh）' },
    wallbox_eff: { label: 'EV充電の効率', title: 'EV充電の効率', entityDesc: 'EV充電の電力量計（kWh）' },
    eigenverbrauch: { label: '自家消費率', title: '自家消費率', entityDesc: '太陽光発電量計（kWh）' },
    cop: { label: 'ヒートポンプCOP', title: 'ヒートポンプCOP', entityDesc: 'ヒートポンプの電力量計（kWh）' },
    wp:       { label: 'ヒートポンプ', title: 'ヒートポンプ', entityDesc: 'ヒートポンプの電力量計（kWh）' },
    klima:    { label: 'エアコン', title: 'エアコン', entityDesc: 'エアコンの電力量計（kWh）' },
    akku:     { label: '蓄電池の充電状態', title: '蓄電池の充電状態', entityDesc: '充電状態センサー（%）' },
    einspeisung: { label: '系統への売電', title: '太陽光の売電', entityDesc: '売電量計（kWh）' },
    overview: { label: '電力概要', title: '電力概要' },
    rooms: { label: '部屋別エネルギー', title: '部屋別の電力使用量' },
  },
};

const MONTHS_ABBR = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
  fr: ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'],
  ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
};
// Schmalste Stufe. Japanisch hat keine sinnvollen Anfangsbuchstaben,
// dort steht die Monatszahl.
const MONTHS_INITIAL = {
  en: ['J','F','M','A','M','J','J','A','S','O','N','D'],
  de: ['J','F','M','A','M','J','J','A','S','O','N','D'],
  fr: ['J','F','M','A','M','J','J','A','S','O','N','D'],
  ja: ['1','2','3','4','5','6','7','8','9','10','11','12'],
};

// Unterstuetzte Oberflaechensprachen. Jede andere Spracheinstellung von
// Home Assistant faellt auf Englisch zurueck.
const LANGS = ['en', 'de', 'fr', 'ja'];

function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  // Regionsanhaenge abschneiden: 'de-CH', 'fr_BE', 'ja-JP' zaehlen mit.
  const code = String(raw).toLowerCase().split(/[-_]/)[0];
  return LANGS.includes(code) ? code : 'en';
}

function t(hass, key, vars) {
  const dict = I18N[lutarymLang(hass)] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  // split/join statt replace: replace mit String-Muster ersetzt nur das
  // erste Vorkommen, und im Japanischen steht {year} teils mehrfach.
  if (vars) Object.keys(vars).forEach(k => { str = str.split(`{${k}}`).join(vars[k]); });
  return str;
}

// ── Farb- und Textsicherheit ──────────────────────────────────────────
// Konfigurationswerte landen direkt in <style>-Bloecken und SVG-Attributen.
// Ohne Pruefung zerlegt ein Wert wie 'red; } body { display:none' das
// Stylesheet der Karte, und ein Titel mit "<" oder "&" das Markup.

// Bringt einen Farbwert auf eine Form, an die sich ein Alpha-Suffix haengen
// laesst: #rgb / #rgba werden auf #rrggbb / #rrggbbaa verdoppelt. Alles
// andere (benannte Farben, rgb(), var()) gibt null zurueck.
function lutarymNormHex(c) {
  if (typeof c !== 'string') return null;
  const s = c.trim();
  let m = /^#([0-9a-f]{3,4})$/i.exec(s);
  if (m) return '#' + m[1].split('').map(ch => ch + ch).join('');
  if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s;
  return null;
}

// Haengt ein Alpha-Suffix an. Bei Farben ohne Hex-Form (z. B. "red") bleibt
// der Wert unveraendert - "red55" waere ungueltig und der Balken unsichtbar.
function lutarymWithAlpha(color, alphaHex) {
  if (!alphaHex) return color;
  const h = lutarymNormHex(color);
  if (!h) return color;
  return h.length === 9 ? h : h + alphaHex;
}

// Laesst nur Formen durch, die in CSS und SVG gefahrlos einsetzbar sind.
function lutarymSafeColor(c, fallback) {
  if (typeof c !== 'string') return fallback;
  const s = c.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;
  if (/^[a-z]+$/i.test(s)) return s;                       // benannte Farbe
  if (/^rgba?\([0-9.,%\s/]+\)$/i.test(s)) return s;
  if (/^hsla?\([0-9.,%\sdegra/]+\)$/i.test(s)) return s;
  if (/^var\(--[a-z0-9_-]+\s*(,\s*[^;{}()]*)?\)$/i.test(s)) return s;
  return fallback;
}

// Escaping fuer Text, der per Template-String ins Markup geschrieben wird.
function lutarymEsc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Automatische Raumerkennung (rooms-Preset) ─────────────────────────
// Grundlage ist allein die device_class: jeder Sensor mit device_class
// 'energy' und einer Zaehler-state_class kommt als Raum in Frage. Die
// Wortlisten unten dienen nur dazu, aus Energie- und Leistungssensor
// denselben Namensstamm zu gewinnen, damit die beiden gepaart werden
// koennen. Die Entity- und Geraete-Registry bleibt aussen vor: sie ist
// fuer Custom Cards nicht dokumentiert und ihr Abruf braucht Adminrechte.
const LUT_ENERGY_TAIL = ['energie','energy','verbrauch','consumption','kwh','wh',
                         'total','gesamt','zaehler','zahler','counter','meter'];
const LUT_POWER_TAIL  = ['leistung','power','watt','w','aktuell','current',
                         'momentan','now','istwert'];
// Zeitraum-Varianten desselben Zaehlers (Utility Meter, Statistik-Helfer).
// Sie tragen dieselbe device_class und wuerden denselben Verbrauch ein
// zweites Mal in die Liste bringen.
const LUT_PERIOD_WORDS = ['heute','today','gestern','yesterday','taeglich','daily',
                          'woche','week','weekly','monat','month','monthly',
                          'jahr','year','yearly','quartal','quarter','stunde',
                          'hour','hourly','letzte','last','vorjahr','vormonat',
                          'vorwoche','bisher'];

// Schneidet die bekannten Endungen ab, damit
// sensor.wallbox_strom_energie und sensor.wallbox_strom_leistung
// beide auf den Stamm "wallbox_strom" fallen.
function lutarymStem(entityId, tail) {
  const parts = entityId.slice(entityId.indexOf('.') + 1).split('_');
  while (parts.length > 1 && tail.includes(parts[parts.length - 1])) parts.pop();
  return parts.join('_');
}

// Anzeigename aus dem friendly_name, ohne die Endung des Energiesensors.
function lutarymRoomName(friendly, fallbackId) {
  const words = String(friendly || fallbackId || '').trim().split(/\s+/);
  while (words.length > 1 && LUT_ENERGY_TAIL.includes(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(' ') || fallbackId || '';
}

// Findet die in Frage kommenden Zaehler und gruppiert sie nach dem
// Bereich, dem sie in Home Assistant zugeordnet sind. areaOf bildet
// entity_id auf {id, name} ab; fehlt die Zuordnung, bleibt der Zaehler
// aussen vor - sein Verbrauch steckt dann in der Zeile "Sonstige", die
// ohnehin die Differenz zum Gesamtzaehler ist.
// Baut entity_id -> {id, name} des zugeordneten Bereichs. Die drei
// list-Kommandos sind nicht adminpflichtig (anders als create/update/delete)
// und liefern, was das hass-Objekt selbst nicht enthaelt. Eine Entity haengt
// entweder direkt an einem Bereich oder ueber ihr Geraet.
async function lutarymLoadAreas(hass) {
  const [areas, devices, entities] = await Promise.all([
    hass.callWS({ type: 'config/area_registry/list' }),
    hass.callWS({ type: 'config/device_registry/list' }),
    hass.callWS({ type: 'config/entity_registry/list' }),
  ]);
  const areaName = new Map((areas || []).map(a => [a.area_id, a.name]));
  const devArea  = new Map((devices || []).map(d => [d.id, d.area_id]));
  const map = new Map();
  for (const e of entities || []) {
    const aid = e.area_id ?? (e.device_id ? devArea.get(e.device_id) : null);
    if (!aid) continue;
    const nm = areaName.get(aid);
    if (nm) map.set(e.entity_id, { id: aid, name: nm });
  }
  return map;
}

function lutarymDetectRooms(hass, opts) {
  const states = hass && hass.states;
  if (!states) return [];
  const o = opts || {};
  const areaOf = o.areaOf || null;
  const inc = String(o.include || '').trim().toLowerCase();
  const exTerms = String(o.exclude || '').split(',')
    .map(x => x.trim().toLowerCase()).filter(Boolean);
  const skipPeriods = o.skipPeriods !== false;

  // Leistungssensoren einmal nach Stamm indizieren.
  const powerByStem = new Map();
  for (const id in states) {
    if (id.slice(0, 7) !== 'sensor.') continue;
    const a = states[id].attributes;
    if (!a || a.device_class !== 'power') continue;
    const st = lutarymStem(id, LUT_POWER_TAIL);
    if (!powerByStem.has(st)) powerByStem.set(st, id);
  }

  const found = [];
  for (const id in states) {
    if (id.slice(0, 7) !== 'sensor.') continue;
    const a = states[id].attributes;
    if (!a || a.device_class !== 'energy') continue;
    // Nur echte Zaehler: die Karte rechnet mit der 'change'-Statistik,
    // die es nur fuer total / total_increasing gibt.
    if (a.state_class !== 'total' && a.state_class !== 'total_increasing') continue;
    const objId = id.slice(7);
    const lowId = id.toLowerCase();
    const name  = String(a.friendly_name || objId);
    const lowNm = name.toLowerCase();
    if (exTerms.some(x => lowId.includes(x) || lowNm.includes(x))) continue;
    if (inc && !lowId.includes(inc) && !lowNm.includes(inc)) continue;
    if (skipPeriods && objId.toLowerCase().split('_').some(w => LUT_PERIOD_WORDS.includes(w))) continue;
    found.push({
      label: lutarymRoomName(name, objId),
      entity: id,
      power_entity: powerByStem.get(lutarymStem(id, LUT_ENERGY_TAIL)) || '',
    });
  }

  // Ohne Bereichszuordnung bleibt nur die flache Liste: jeder Zaehler ist
  // dann seine eigene Zeile. Das gilt aber erst, wenn das Laden der
  // Registry endgueltig gescheitert ist. Solange es noch laeuft, wird
  // nichts zurueckgegeben - sonst zeigte die Karte fuer einen Moment
  // Sensornamen und sprungartig danach die Bereiche.
  if (!areaOf) {
    if (!o.flatFallback) return [];
    found.sort((a, b) => a.label.localeCompare(b.label));
    return found.map(f => ({
      name: f.label, entities: [f.entity],
      power_entities: f.power_entity ? [f.power_entity] : [],
    }));
  }

  const byArea = new Map();
  for (const f of found) {
    const area = areaOf.get(f.entity);
    if (!area) continue;  // keinem Bereich zugeordnet
    let g = byArea.get(area.id);
    if (!g) { g = { name: area.name, entities: [], power_entities: [] }; byArea.set(area.id, g); }
    g.entities.push(f.entity);
    if (f.power_entity) g.power_entities.push(f.power_entity);
  }
  const groups = [...byArea.values()];
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

function presetInfo(hass, cardType) {
  const dict = PRESET_I18N[lutarymLang(hass)] || PRESET_I18N.en;
  return dict[cardType] ?? PRESET_I18N.en[cardType];
}

// ── Presets for the different card types (language-independent data) ───────

const PRESETS = {
  autarkie: {
    entity:     'sensor.autarkie',
    color:      '#22c55e',
    colorPrev:  '#888888',
    unit:       '%',
    statType:   'mean',      // 'mean' = monthly average value (recorder mean)
    fixedMax:   100,         // Y-axis fixed 0-100%
    aggregate:  'avg',       // summary value: average instead of sum
    valueSuffix: '%',
  },
  energy: {
    entity:     'sensor.stromverbrauch',
    color:      '#facc15',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
  },
  pv: {
    entity:     'sensor.pv_ertrag',
    color:      '#f59e0b',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
    supportsCapacityLine: true, // this preset offers the optional "installed capacity (kWp)" reference line
    supportsPeakPower: true,    // this preset offers the optional monthly peak-power marker (needs a power entity)
  },
  wallbox: {
    entity:     'sensor.wallbox',
    color:      '#3b82f6',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
    supportsDistanceLine: true, // this preset offers the optional "km driven" line overlay
  },
  // Charging efficiency: share of the wallbox charging that happened while NO
  // grid was drawn. Separate preset from "wallbox" (which stays a plain kWh
  // preset). Rendered as a fixed 0-100 % bar chart per month.
  //   entity       = total wallbox charging energy (kWh)
  //   grid_entity  = grid draw: POWER (W/kW) or ENERGY (kWh). Power is
  //                  integrated from recorded hourly means to monthly import
  //                  kWh (import only). See _fetchImportEnergyYear.
  // Monthly value = (1 − grid_import_kWh / total_kWh) * 100, clamped 0-100.
  // No grid draw ⇒ 100 %. All conversion happens in the card; no template.
  wallbox_eff: {
    entity:     '',
    color:      '#6366f1',
    colorPrev:  '#888888',
    unit:       '%',
    statType:   'change',
    fixedMax:   100,
    aggregate:  'avg',            // summary = average of the monthly shares (like autarkie)
    valueSuffix: '%',
    isRatio:    true,             // value = (1 − grid_import / entity) * 100 per month
    ratioMode:  'marginal_hourly',
    secondKey:  'grid_entity',
  },
  // Self-consumption rate: how much of the PV generation was used at home
  // instead of exported. entity = PV yield (kWh), feedin_entity = grid feed-in
  // (kWh). Monthly = (PV − feedin) / PV · 100. Both are directly metered, so a
  // plain monthly ratio is exact — no per-hour split needed.
  eigenverbrauch: {
    entity:     '',
    color:      '#84cc16',
    colorPrev:  '#888888',
    unit:       '%',
    statType:   'change',
    fixedMax:   100,
    aggregate:  'avg',
    valueSuffix: '%',
    isRatio:    true,
    ratioMode:  'complement_monthly',
    secondKey:  'feedin_entity',
  },
  // Heat pump COP: heat produced per unit of electricity. entity = electrical
  // energy consumed (kWh), heat_entity = thermal energy produced (kWh, e.g.
  // from Heishamon). Monthly = heat / electricity (a number ~2–5, NOT a %).
  // Auto-scaled axis; needs a real thermal-energy sensor to be meaningful.
  cop: {
    entity:     '',
    color:      '#d946ef',
    colorPrev:  '#888888',
    unit:       '',
    statType:   'change',
    aggregate:  'avg',
    valueSuffix: '',
    decimals:   2,
    isRatio:    true,
    ratioMode:  'quotient_monthly',
    secondKey:  'heat_entity',
  },
  wp: {
    entity:     'sensor.waermepumpe',
    color:      '#ef4444',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
    supportsTemperatureLine: true, // this preset offers the optional outdoor-temperature line overlay
  },
  klima: {
    entity:     'sensor.klimaanlage',
    color:      '#06b6d4',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
    supportsTemperatureLine: true, // same mechanism as wp — more AC use tends to track hotter months
  },
  akku: {
    entity:     'sensor.akku_ladezustand',
    color:      '#8b5cf6',
    colorPrev:  '#888888',
    unit:       '%',
    statType:   'mean',      // default display mode ('mean'); 'minmax' selectable in the editor
    fixedMax:   100,         // Y-axis fixed 0-100%
    aggregate:  'avg',
    valueSuffix: '%',
    supportsRange: true,     // this preset offers the "Display: Average / Min/max range" dropdown
  },
  einspeisung: {
    entity:     '',          // no default — publicly shared card, must not assume anyone's entity naming
    color:      '#ec4899',
    colorPrev:  '#888888',
    unit:       'kWh',
    statType:   'change',
    fixedMax:   null,
    aggregate:  'sum',
    valueSuffix: '',
  },
  // Not a bar preset: a text/number cost + consumption summary (ported from
  // the standalone lutarym-electricity-overview-card). Rendered via its own
  // path; the `mode` marker makes every bar-specific code path skip it.
  overview: {
    mode: 'overview',
    entity: '',
    color: '#0ea5e9',
  },
  // Not a bar preset: per-room yearly kWh with % share of the house total,
  // ported from lutarym-room-energy-card. Own render + editor path.
  rooms: {
    mode: 'rooms',
    entity: '',
    color: '#10b981',
  },
};

const CARD_TYPE_KEYS = Object.keys(PRESETS);

// ── Main card ───────────────────────────────────────────────────────────

class EnergyChartsByLutarym extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._seriesYears = [];   // years, oldest first, last = current year
    this._seriesData  = [];   // per year: Array[12] of monthly values
    this._peakPowerData = []; // per year: Array[12] of monthly max power (kW), only when a power entity is configured
    // Outdoor temperature — shape depends on temp_mode:
    //  - 'daily': Array of {month, day, value} for the current year only
    //  - 'mean' | 'minmax': per year, Array[12] of {mean, min, max} (°C)
    this._temperatureDaily   = [];
    this._temperatureMonthly = [];
    this._distanceData = []; // per year: Array[12] of monthly km driven, only when a distance entity is configured
    // Verhaeltnis-Presets: pro Jahr {num, den} ueber ALLE Monate. Der
    // Jahreswert ist damit energiegewichtet (Sigma Zaehler / Sigma Nenner)
    // statt ein ungewichtetes Mittel der Monatsquoten - ein Monat mit
    // 10 kWh darf nicht so schwer wiegen wie einer mit 900 kWh.
    this._ratioTotals = [];
    this._loading   = true;
    this._error     = null;
    this._lastFetch = 0;
    this._width     = 0;
    this._height    = 0;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  connectedCallback() {
    this._ro = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (Math.abs(w - this._width) > 4 || Math.abs(h - this._height) > 4) {
          this._width  = w;
          this._height = h;
          changed = true;
        }
      }
      if (!changed || this._roFrame) return;
      // Ein Rebuild pro Frame. _render() ersetzt das komplette Shadow-DOM
      // und veraendert dabei die Hoehe, was den Observer erneut ausloesen
      // kann; beim Ziehen am Kartenrand waeren das sonst dutzende
      // Neuaufbauten je Sekunde (mit temp_mode 'daily' je ueber hundert
      // SVG-Knoten samt Listenern).
      this._roFrame = requestAnimationFrame(() => {
        this._roFrame = 0;
        this._render();
      });
    });
    this._ro.observe(this);
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    if (this._roFrame) { cancelAnimationFrame(this._roFrame); this._roFrame = 0; }
    // Laufende Abrufe sollen nach dem Entfernen der Karte nicht mehr rendern.
    this._fetchRun = (this._fetchRun || 0) + 1;
  }

  // ── HA hooks ──────────────────────────────────────────────────────────

  setConfig(config) {
    const cardType = CARD_TYPE_KEYS.includes(config.card_type) ? config.card_type : 'energy';
    const preset = PRESETS[cardType];

    // Overview mode: a completely separate config + render path. Store the
    // overview-specific fields and skip all bar-chart wiring below.
    if (preset.mode === 'overview') {
      this._isOverview = true;
      this._preset = preset;
      const changed = !this._config
        || this._config.card_type !== cardType
        || this._config.energy_entity !== (config.energy_entity || config.entity || '')
        || this._config.previous_year_kwh != config.previous_year_kwh;
      this._config = {
        card_type: cardType,
        energy_entity: config.energy_entity || config.entity || '',
        entity: config.energy_entity || config.entity || '', // so notConfigured checks pass
        price_per_kwh: config.price_per_kwh,
        base_fee_yearly: config.base_fee_yearly,
        base_fee_monthly: config.base_fee_monthly,
        base_fee_mode: config.base_fee_mode || 'accrued',
        currency: config.currency || 'EUR',
        previous_year_kwh: config.previous_year_kwh,
        title: config.title ?? presetInfo(this._hass, cardType).title,
        titleFontSize: Number(config.title_font_size) || 14,
        appearance: config.appearance ?? 'auto',
      };
      if (changed) { this._overviewData = null; this._lastFetch = 0; }
      // Nur bei echter Aenderung abrufen. Ohne diese Bedingung loest jeder
      // Tastendruck im Editor (Titel, Preis, Grundgebuehr) eine
      // Statistikabfrage ueber zwei Jahre aus.
      if (changed && this._hass && this._config.energy_entity) this._fetchOverview();
      this._render();
      return;
    }
    this._isOverview = false;

    // Rooms mode: per-room yearly kWh with share of total. Own render/editor.
    if (preset.mode === 'rooms') {
      this._isRooms = true;
      this._preset = preset;
      const roomsIn = Array.isArray(config.rooms) ? config.rooms.slice(0, 10) : [];
      const roomsAuto = config.rooms_auto === true;
      const autoInclude = config.rooms_auto_include || '';
      const autoExclude = config.rooms_auto_exclude || '';
      const pvEntity = config.pv_entity || '';
      const feedinEntity = config.feedin_entity || '';
      // Bei aktiver Automatik haengt die Raumliste nicht an der Konfiguration,
      // sondern an den Filtern - die gehoeren deshalb in die Signatur.
      const roomsSig = roomsAuto
        ? `auto|${autoInclude}|${autoExclude}`
        : JSON.stringify(roomsIn.map(r => r.entity));
      const changed = !this._config
        || this._config.card_type !== cardType
        || this._config.total_entity !== (config.total_entity || '')
        || this._config.pvEntity !== pvEntity
        || this._config.feedinEntity !== feedinEntity
        || this._config.roomsAuto !== roomsAuto
        || this._roomsSig !== roomsSig;
      this._roomsSig = roomsSig;
      if (changed) this._autoSig = null; // Erkennung neu durchlaufen lassen
      this._config = {
        card_type: cardType,
        total_entity: config.total_entity || '',
        pvEntity,
        feedinEntity,
        roomsAuto,
        autoInclude,
        autoExclude,
        // Nebeneinander statt untereinander. Bei 1 bleibt das bisherige
        // einzeilige Layout, ab 2 rutscht der Balken unter den Namen.
        roomsColumns: Math.min(3, Math.max(1, Number(config.rooms_columns) || 1)),
        entity: config.total_entity || (roomsIn.length || roomsAuto ? '__rooms__' : ''), // notConfigured check
        rooms: roomsIn.map(r => ({ name: r.name || '', entity: r.entity || '', power_entity: r.power_entity || '' })),
        title: config.title ?? presetInfo(this._hass, cardType).title,
        titleFontSize: Number(config.title_font_size) || 14,
        appearance: config.appearance ?? 'auto',
        color: lutarymSafeColor(config.color, preset.color),
      };
      if (changed) { this._roomsData = null; this._lastFetch = 0; }
      // roomsAuto muss hier mit rein: die Bereiche sind noch nicht geladen,
      // _effectiveRooms() ist also leer, und ohne Gesamtzaehler kaeme der
      // Abruf sonst nie zustande. _fetchRooms holt die Bereiche selbst.
      if (changed && this._hass
          && (this._config.total_entity || this._config.roomsAuto || this._effectiveRooms().length)) this._fetchRooms();
      this._render();
      return;
    }
    this._isRooms = false;
    const info = presetInfo(this._hass, cardType);

    const newEntity = config.entity ?? preset.entity;
    const rawYearsBack = config.years_back != null ? Number(config.years_back) : 1;
    const newYearsBack = Math.min(3, Math.max(0, rawYearsBack));
    // 'minmax' only applies for presets that opt in (supportsRange); otherwise always 'mean'.
    const newStatMode = (preset.supportsRange && config.stat_mode === 'minmax') ? 'minmax' : 'mean';
    // No default here either — this is a second, distinct entity (instantaneous power,
    // not the cumulative energy entity above), only meaningful for supportsPeakPower presets.
    const newPowerEntity = (preset.supportsPeakPower && config.power_entity) ? config.power_entity : '';
    // Same reasoning for the outdoor-temperature line — a separate entity, only
    // meaningful for supportsTemperatureLine presets.
    const newTemperatureEntity = (preset.supportsTemperatureLine && config.temperature_entity) ? config.temperature_entity : '';
    const TEMP_MODES = ['daily', 'minmax', 'mean'];
    const newTempMode = TEMP_MODES.includes(config.temp_mode) ? config.temp_mode : 'daily';
    // Distance driven — a cumulative counter like the energy sensor itself,
    // so it's fetched the same way ('change'/sum per month), only meaningful
    // for supportsDistanceLine presets.
    const newDistanceEntity = (preset.supportsDistanceLine && config.distance_entity) ? config.distance_entity : '';
    // Numerator entity for ratio presets (wallbox_eff): kWh charged grid-free.
    const newGridfreeEntity = (preset.isRatio && preset.secondKey && config[preset.secondKey])
      ? config[preset.secondKey] : '';
    const entityOrTypeChanged =
      !this._config ||
      this._config.card_type !== cardType ||
      this._config.entity !== newEntity ||
      this._config.powerEntity !== newPowerEntity ||
      this._config.temperatureEntity !== newTemperatureEntity ||
      this._config.tempMode !== newTempMode ||
      this._config.distanceEntity !== newDistanceEntity ||
      this._config.gridEntity !== newGridfreeEntity ||
      this._config.heatEntity2 !== (config.heat_entity2 || '') ||
      this._config.yearsBack !== newYearsBack ||
      this._config.statMode !== newStatMode;

    this._config = {
      card_type:  cardType,
      entity:     newEntity,
      powerEntity: newPowerEntity, // optional second entity (instantaneous power) for the peak-power markers
      temperatureEntity: newTemperatureEntity, // optional second entity (outdoor temp) for the temperature line
      tempMode:   newTempMode, // 'daily' | 'minmax' | 'mean' — how the temperature line is aggregated
      distanceEntity: newDistanceEntity, // optional second entity (km driven) for the distance line
      gridEntity: newGridfreeEntity, // grid entity (energy kWh or power W) for wallbox_eff
      gridImportNegative: config.grid_import_negative === true, // some meters sign import negative
      heatEntity2: config.heat_entity2 || '', // optional 2nd thermal source for COP (heating + DHW)
      title:      config.title      ?? info.title,
      // Farbwerte einmal hier pruefen, danach sind sie ueberall im Markup
      // gefahrlos. Ein ungueltiger Wert faellt auf den Preset-Standard
      // zurueck, statt CSS-Regel oder SVG-Attribut zu zerlegen.
      color:      lutarymSafeColor(config.color, preset.color),
      colorPrev:  lutarymSafeColor(config.color_prev, preset.colorPrev),
      colorText:  config.color_text ? lutarymSafeColor(config.color_text, null) : null, // null = folgt dem Theme
      colorDim:   config.color_dim  ? lutarymSafeColor(config.color_dim, null)  : null, // null = automatisch abgeleitet
      colorTemp:  lutarymSafeColor(config.color_temp, '#0ea5e9'),
      colorDistance: lutarymSafeColor(config.color_distance, '#84cc16'),
      appearance: config.appearance ?? 'auto', // 'auto' | 'light' | 'dark'
      titleFontSize: Number(config.title_font_size) || 14,
      labelFontSize: config.label_font_size ? Number(config.label_font_size) : null, // null = automatic (responsive)
      yearsBack:  newYearsBack, // 0-3, how many years in addition to the current year are shown
      statMode:   newStatMode,  // 'mean' | 'minmax' — only meaningful for presets with supportsRange
      // Installed capacity reference line — only meaningful for presets with supportsCapacityLine.
      // No default: never assume a value for a card shared publicly. Purely a display constant,
      // doesn't affect data fetching.
      kwp: (preset.supportsCapacityLine && config.kwp != null && config.kwp !== ''
            && Number.isFinite(Number(config.kwp))) ? Number(config.kwp) : null,
      // Whether to show the number above each bar — applies to every card
      // type, purely a rendering choice, default on. Doesn't affect the
      // axis scale or the summary line above the chart.
      showValues: config.show_values !== false,
      // In-chart year legend (small swatches top-right). Redundant with the
      // summary line above the chart, so off by default; opt in explicitly.
      showLegend: config.show_legend === true,
      // Y-axis scaling controls (bar/left axis only; fixed-max presets like
      // autarkie/akku 0-100% are unaffected). yMax: a hard top value — when
      // set, the axis is exactly this, no nice-rounding. yHeadroom: percent of
      // extra space above the highest bar in automatic mode (default 20).
      // Number('abc') ergibt NaN; ohne Pruefung faellt die Achsenrechnung
      // dann komplett aus (jede Balkenhoehe wird NaN).
      yMax: Number.isFinite(Number(config.y_max)) && config.y_max !== '' && config.y_max != null
        ? Number(config.y_max) : null,
      yHeadroom: Number.isFinite(Number(config.y_headroom)) && config.y_headroom !== '' && config.y_headroom != null
        ? Math.max(0, Number(config.y_headroom)) : null,
    };
    this._preset = preset;

    if (entityOrTypeChanged) {
      // Only reload data on type/entity/years change (not on every
      // keystroke in the editor's title/color fields — avoids preview flicker).
      this._lastFetch = 0;
      this._seriesYears = [];
      this._seriesData  = [];
      this._ratioTotals = [];
      const ratioReady = !this._preset.isRatio || !!this._config.gridEntity;
      this._loading   = !!this._config.entity && ratioReady;
      if (this._hass && this._config.entity && ratioReady) this._fetchData();
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._isOverview) {
      if (this._config?.energy_entity && Date.now() - this._lastFetch > 15 * 60 * 1000) {
        this._fetchOverview();
      }
      return;
    }
    if (this._isRooms) {
      if ((this._config?.total_entity || this._config?.roomsAuto || this._effectiveRooms().length)
          && Date.now() - this._lastFetch > 15 * 60 * 1000) {
        this._fetchRooms();
      } else if (this._roomsData) {
        // Live-Watt aktualisieren, ohne die Statistik erneut zu holen.
        // set hass laeuft bei JEDER Zustandsaenderung in Home Assistant, in
        // groesseren Installationen mehrmals pro Sekunde. Ohne den Vergleich
        // unten wuerde die Karte alle 1,5 s ihr komplettes Shadow-DOM neu
        // aufbauen, auch wenn sich keine der konfigurierten Leistungs-
        // Entities geruehrt hat.
        const sig = this._effectiveRooms()
          .map(r => (r.power_entities || [])
            .map(pe => hass?.states?.[pe]?.state ?? '').join(','))
          .join('|');
        if (sig !== this._roomsWattSig) {
          this._roomsWattSig = sig;
          this._render();
        }
      }
      return;
    }
    const ratioReady = !this._preset?.isRatio || !!this._config?.gridEntity;
    if (this._config?.entity && ratioReady && Date.now() - this._lastFetch > 3_600_000) {
      this._fetchData();
    }
  }

  static getConfigElement() {
    return document.createElement('energy-charts-by-lutarym-editor');
  }

  static getStubConfig() {
    return { card_type: 'energy' };
  }

  // Modern approach (HA automatically renders a native <ha-form> if the
  // editor component below fails to load for some reason). Serves as a
  // fallback/extra safeguard so a GUI form is guaranteed to appear.
  static getConfigForm() {
    const lang = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
    const fallbackHass = { language: lang };
    return {
      schema: [
        {
          name: 'card_type',
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: CARD_TYPE_KEYS.map(k => ({ value: k, label: presetInfo(fallbackHass, k).label })),
            },
          },
        },
        { name: 'entity', selector: { entity: {} } },
        { name: 'title', selector: { text: {} } },
        {
          name: 'stat_mode',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'mean',   label: t(fallbackHass, 'statModeMean') },
                { value: 'minmax', label: t(fallbackHass, 'statModeMinMax') },
              ],
            },
          },
        },
        {
          name: 'years_back',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: '0', label: t(fallbackHass, 'yearsBack0') },
                { value: '1', label: t(fallbackHass, 'yearsBack1') },
                { value: '2', label: t(fallbackHass, 'yearsBack2') },
                { value: '3', label: t(fallbackHass, 'yearsBack3') },
              ],
            },
          },
        },
        { name: 'show_values', selector: { boolean: {} } },
        { name: 'show_legend', selector: { boolean: {} } },
        { name: 'y_max', selector: { number: { min: 0, mode: 'box' } } },
        { name: 'y_headroom', selector: { number: { min: 0, max: 200, mode: 'box', unit_of_measurement: '%' } } },
        { name: 'color', selector: { text: { type: 'color' } } },
        { name: 'color_prev', selector: { text: { type: 'color' } } },
        { name: 'color_text', selector: { text: { type: 'color' } } },
        { name: 'color_dim', selector: { text: { type: 'color' } } },
        {
          name: 'appearance',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'auto', label: t(fallbackHass, 'appearanceAuto') },
                { value: 'light', label: t(fallbackHass, 'appearanceLight') },
                { value: 'dark', label: t(fallbackHass, 'appearanceDark') },
              ],
            },
          },
        },
        { name: 'title_font_size', selector: { number: { min: 8, max: 32, mode: 'box', unit_of_measurement: 'px' } } },
        { name: 'label_font_size', selector: { number: { min: 6, max: 20, mode: 'box', unit_of_measurement: 'px' } } },
      ],
      computeLabel: (schema) => ({
        card_type: t(fallbackHass, 'editorCardType'),
        entity: t(fallbackHass, 'editorEntity'),
        title: t(fallbackHass, 'editorTitle'),
        stat_mode: t(fallbackHass, 'editorStatMode'),
        years_back: t(fallbackHass, 'editorYearsBack'),
        show_values: t(fallbackHass, 'editorShowValues'),
        show_legend: t(fallbackHass, 'editorShowLegend'),
        y_max: t(fallbackHass, 'editorYMax'),
        y_headroom: t(fallbackHass, 'editorYHeadroom'),
        color: t(fallbackHass, 'colorCurrentYear'),
        color_prev: t(fallbackHass, 'colorPreviousYears'),
        color_text: t(fallbackHass, 'colorTextValues'),
        color_dim: t(fallbackHass, 'colorDimLabel'),
        appearance: t(fallbackHass, 'editorAppearance'),
        title_font_size: t(fallbackHass, 'editorTitleFontSize'),
        label_font_size: t(fallbackHass, 'editorLabelFontSize'),
      })[schema.name] ?? schema.name,
    };
  }

  // ── Data fetching ────────────────────────────────────────────────────

  // True if the current preset+config combination should fetch/render the
  // "min/max range per month" view instead of a single value per month.
  _isRangeMode() {
    return !!(this._preset?.supportsRange && this._config?.statMode === 'minmax');
  }

  async _fetchYear(year, entity = this._config.entity) {
    const rangeMode = this._isRangeMode();
    const statType  = this._preset.statType; // 'mean' or 'change'
    const types     = rangeMode ? ['mean', 'min', 'max'] : [statType];
    const wsRequest = {
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'month',
      types,
    };
    if (!rangeMode && statType === 'change') {
      wsRequest.units = { energy: 'kWh' };
    }

    const result = await this._hass.callWS(wsRequest);
    const stats = result?.[entity] ?? [];
    return Array.from({ length: 12 }, (_, month) => {
      // WICHTIG: sowohl Monat als auch Jahr prüfen, nicht nur Monat -
      // sonst kann bei einer inklusiven end_time-Grenze der Recorder-API
      // der Januar-Eintrag des FOLGEJAHRS versehentlich in die Abfrage
      // dieses Jahres hineinrutschen und von .find() fälschlich für
      // Monat 0 (Januar) genommen werden. Symptom war: Januar zeigte in
      // allen Kartentypen für JEDES Jahr denselben (falschen) Wert.
      const entry = stats.find(s => {
        const d = new Date(s.start);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      if (!entry) return null;
      if (rangeMode) {
        if (entry.min == null && entry.max == null && entry.mean == null) return null;
        return { mean: entry.mean ?? null, min: entry.min ?? null, max: entry.max ?? null };
      }
      return entry[statType] ?? null;
    });
  }

  // Detect whether an entity reports power (W/kW) rather than energy (kWh/Wh),
  // so the efficiency preset knows to integrate it instead of using change.
  _entityIsPower(entity) {
    const unit = this._hass?.states?.[entity]?.attributes?.unit_of_measurement;
    if (!unit) return false;
    const u = String(unit).trim().toLowerCase();
    return u === 'w' || u === 'kw';
  }

  // Per-hour ENERGY (kWh) from a cumulative energy sensor's exact hourly
  // "change" statistic. Returned as Map(hourStartISO → kWh). Kept forever by
  // HA for sum sensors, so this spans the full history — not just ~11 days.
  async _fetchEnergyHours(entity, year) {
    const res = await this._hass.callWS({
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'hour',
      types:         ['change'],
      units:         { energy: 'kWh' },
    });
    const rows = res?.[entity] ?? [];
    const map = new Map();
    for (const r of rows) {
      const v = Number(r.change);
      if (!Number.isFinite(v)) continue;
      if (new Date(r.start).getFullYear() !== year) continue;
      map.set(r.start, v);
    }
    return map;
  }

  // Per-hour grid IMPORT energy (kWh) derived from a POWER sensor's hourly
  // mean, import only. Sign is configurable because some meters report import
  // as negative. Returned as Map(hourStartISO → kWh). Only used when the grid
  // entity is a power sensor; an energy (kWh) grid entity uses _fetchEnergyHours.
  async _fetchPowerImportHours(entity, year) {
    const res = await this._hass.callWS({
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'hour',
      types:         ['mean'],
    });
    const rows = res?.[entity] ?? [];
    const unit = String(
      this._hass?.states?.[entity]?.attributes?.unit_of_measurement || 'W'
    ).trim().toLowerCase();
    const toKW = unit === 'kw' ? 1 : 1 / 1000;
    const sign = this._config.gridImportNegative ? -1 : 1;
    const map = new Map();
    for (const r of rows) {
      const mean = Number(r.mean);
      if (!Number.isFinite(mean)) continue;
      if (new Date(r.start).getFullYear() !== year) continue;
      map.set(r.start, Math.max(0, mean * sign) * toKW); // one-hour bucket → kWh
    }
    return map;
  }

  // Monthly ENERGY (kWh) for an entity that may be POWER (W/kW) or ENERGY
  // (kWh). Power → integrate hourly means (mean · 1h), summed per month.
  // Energy → monthly change. Used by the COP preset, where both the produced
  // and consumed sides are Heishamon power sensors.
  async _fetchMonthlyEnergy(entity, year) {
    if (this._entityIsPower(entity)) {
      const res = await this._hass.callWS({
        type:          'recorder/statistics_during_period',
        start_time:    new Date(year, 0, 1).toISOString(),
        end_time:      new Date(year + 1, 0, 1).toISOString(),
        statistic_ids: [entity],
        period:        'hour',
        types:         ['mean'],
      });
      const rows = res?.[entity] ?? [];
      const unit = String(
        this._hass?.states?.[entity]?.attributes?.unit_of_measurement || 'W'
      ).trim().toLowerCase();
      const toKW = unit === 'kw' ? 1 : 1 / 1000;
      const months = new Array(12).fill(null);
      for (const r of rows) {
        const mean = Number(r.mean);
        if (!Number.isFinite(mean)) continue;
        const d = new Date(r.start);
        if (d.getFullYear() !== year) continue;
        months[d.getMonth()] = (months[d.getMonth()] ?? 0) + Math.max(0, mean) * toKW;
      }
      return months;
    }
    // Energy sensor: monthly change (kWh).
    return this._fetchYear(year, entity);
  }
  // this is a different measurement than the energy entity above (power vs.
  // cumulative energy), so it needs its own recorder query. Only called when
  // a power entity is actually configured.
  async _fetchPeakPower(year) {
    const entity = this._config.powerEntity;
    const wsRequest = {
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'month',
      types:         ['max'],
      units:         { power: 'kW' }, // normalize regardless of whether the entity reports W, kW, ...
    };
    const result = await this._hass.callWS(wsRequest);
    const stats = result?.[entity] ?? [];
    return Array.from({ length: 12 }, (_, month) => {
      const entry = stats.find(s => {
        const d = new Date(s.start);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return entry?.max ?? null;
    });
  }

  // Monthly distance driven — a cumulative counter (odometer-style), so
  // 'change' (like the wallbox energy sensor itself) is the meaningful
  // monthly statistic here, not mean/min/max.
  async _fetchDistance(year) {
    const entity = this._config.distanceEntity;
    const wsRequest = {
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'month',
      types:         ['change'],
      units:         { distance: 'km' }, // HA-Einheitenklasse heisst "distance" (nicht "length") -
                                         // mit falschem Key bleibt ein Meilen-Zaehler unkonvertiert.
    };
    const result = await this._hass.callWS(wsRequest);
    const stats = result?.[entity] ?? [];
    return Array.from({ length: 12 }, (_, month) => {
      const entry = stats.find(s => {
        const d = new Date(s.start);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return entry?.change ?? null;
    });
  }

  // Monthly outdoor temperature — mean, min and max together (used by both
  // the 'mean' and 'minmax' display modes, so one query covers both; which
  // fields actually get drawn is a rendering choice, not a fetch choice).
  async _fetchTemperatureMonthly(year) {
    const entity = this._config.temperatureEntity;
    const wsRequest = {
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'month',
      types:         ['mean', 'min', 'max'],
      units:         { temperature: '°C' },
    };
    const result = await this._hass.callWS(wsRequest);
    const stats = result?.[entity] ?? [];
    return Array.from({ length: 12 }, (_, month) => {
      const entry = stats.find(s => {
        const d = new Date(s.start);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      if (!entry) return null;
      return { mean: entry.mean ?? null, min: entry.min ?? null, max: entry.max ?? null };
    });
  }

  // Daily outdoor temperature for 'daily' mode — current year only (see
  // _buildChart for why). One mean value per calendar day, which is what
  // "täglich" means here — not full raw sensor resolution, which would be
  // hundreds of times more data for no real gain at this chart's size.
  async _fetchTemperatureDaily(year) {
    const entity = this._config.temperatureEntity;
    const wsRequest = {
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'day',
      types:         ['mean'],
      units:         { temperature: '°C' },
    };
    const result = await this._hass.callWS(wsRequest);
    const stats = result?.[entity] ?? [];
    return stats
      .map(s => {
        const d = new Date(s.start);
        return { month: d.getMonth(), day: d.getDate(), value: s.mean ?? null };
      })
      .filter(p => p.value != null);
  }

  // Derives monthly {mean, min, max} from the daily array — used when
  // 'daily' mode has to fall back to a coarser view (narrow card), so no
  // second network request is needed just because the card got resized.
  static monthlyFromDaily(daily) {
    const byMonth = Array.from({ length: 12 }, () => []);
    (daily || []).forEach(p => { if (p.value != null) byMonth[p.month].push(p.value); });
    return byMonth.map(vals => {
      if (!vals.length) return null;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { mean, min: Math.min(...vals), max: Math.max(...vals) };
    });
  }

  // ── Overview mode: yearly consumption ──
  // Basis ist die 'change'-Statistik pro Tag statt des kumulierten 'sum'.
  // Grund: der alte Weg brauchte einen Statistikpunkt VOR dem 1.1. des
  // Vorjahres als Startzaehlerstand, das Abfragefenster begann aber exakt
  // an diesem Tag - dieser Punkt konnte also nie geliefert werden und der
  // Vorjahreswert blieb dauerhaft leer. 'change' ist ausserdem gegen
  // Zaehlerwechsel und Statistikluecken unempfindlich.
  async _fetchOverview() {
    if (!this._hass || !this._config?.energy_entity) return;
    if (this._ovLoading) return;
    this._ovLoading = true;
    this._lastFetch = Date.now();

    const entity   = this._config.energy_entity;
    const now      = new Date();
    const year     = now.getFullYear();
    const jan1Prev = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    // Gleicher Kalenderstichtag im Vorjahr - Basis fuer den fairen
    // Vorjahresvergleich. Ohne ihn stuende "bisher dieses Jahr" gegen ein
    // volles Vorjahr, der Prozentwert waere dann allein vom Datum bestimmt
    // (Ende September immer rund -25 %, unabhaengig vom Verbrauch).
    const sameDayPrev = new Date(year - 1, now.getMonth(), now.getDate(),
                                 now.getHours(), now.getMinutes(), 0, 0).getTime();

    try {
      const result = await this._hass.callWS({
        type:          'recorder/statistics_during_period',
        start_time:    jan1Prev.toISOString(),
        end_time:      now.toISOString(),
        statistic_ids: [entity],
        period:        'day',
        types:         ['change'],
        units:         { energy: 'kWh' }, // sonst rechnet ein Wh-/MWh-Zaehler die Kosten um Faktor 1000 falsch
      });
      const points = (result && result[entity]) ? result[entity] : [];

      let current = 0, previous = 0, previousYtd = 0;
      let hasCur = false, hasPrev = false;
      let firstCurMonth = null;
      for (const p of points) {
        const v = Number(p.change);
        if (!Number.isFinite(v) || v < 0) continue; // negativer Sprung = Zaehlerreset
        const d  = new Date(p.start);
        const py = d.getFullYear();
        if (py === year) {
          current += v;
          hasCur = true;
          if (firstCurMonth === null || d.getMonth() < firstCurMonth) firstCurMonth = d.getMonth();
        } else if (py === year - 1) {
          previous += v;
          hasPrev = true;
          if (d.getTime() < sameDayPrev) previousYtd += v;
        }
      }

      if (!hasCur && !hasPrev) {
        this._overviewData = { error: t(this._hass, 'ovNoStatsYet') };
        return;
      }

      // "Sensor erst unterjaehrig vorhanden": kein Vorjahr vorhanden und das
      // laufende Jahr beginnt nicht im Januar.
      const partialYear = !hasPrev && firstCurMonth !== null && firstCurMonth > 0;

      const manualPrev = (this._config.previous_year_kwh != null && this._config.previous_year_kwh !== '')
        ? Number(this._config.previous_year_kwh) : null;

      this._overviewData = {
        current,
        // Anzeigewert "Vorjahr": volles Vorjahr, bzw. die manuelle Vorgabe.
        previous: manualPrev ?? (hasPrev ? previous : null),
        // Vergleichswert: gleicher Zeitraum im Vorjahr. Zu einer manuellen
        // Jahresvorgabe gibt es keinen - dann entfaellt der Prozentvergleich.
        previousYtd: manualPrev != null ? null : (hasPrev ? previousYtd : null),
        partialYear,
      };
    } catch (e) {
      this._overviewData = { error: t(this._hass, 'ovWsError', { msg: e?.message ?? String(e) }) };
    } finally {
      this._ovLoading = false;
      this._render();
    }
  }

  // ── Rooms mode: yearly kWh per room + total ──
  // Jahres-kWh fuer mehrere Zaehler in EINEM Aufruf. Bei nach Bereichen
  // gruppierten Raeumen kommen leicht zwanzig Zaehler zusammen; einzeln
  // abgefragt waeren das ebenso viele Rundreisen.
  async _roomsYearKwhBatch(ids) {
    const list = [...new Set(ids.filter(Boolean))];
    const out = new Map();
    if (!list.length) return out;
    const year = new Date().getFullYear();
    const result = await this._hass.callWS({
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: list,
      period:        'month',
      units:         { energy: 'kWh' },
      types:         ['change'],
    });
    for (const id of list) {
      // Nur Punkte des abgefragten Jahres: die end_time-Grenze der
      // Recorder-API kann den Januar des FOLGEJAHRS mitliefern.
      const pts = (result?.[id] ?? []).filter(p => new Date(p.start).getFullYear() === year);
      if (!pts.length) { out.set(id, null); continue; }
      const sum = pts.reduce((a, p) =>
        a + (typeof p.change === 'number' && p.change >= 0 ? p.change : 0), 0);
      out.set(id, sum > 0 ? sum : null);
    }
    return out;
  }

  async _roomYearKwh(entity) {
    if (!entity) return null;
    const now = new Date();
    const year = now.getFullYear();
    const result = await this._hass.callWS({
      type:          'recorder/statistics_during_period',
      start_time:    new Date(year, 0, 1).toISOString(),
      end_time:      new Date(year + 1, 0, 1).toISOString(),
      statistic_ids: [entity],
      period:        'month',
      units:         { energy: 'kWh' },
      types:         ['change'],
    });
    // Nur Punkte des abgefragten Jahres: die end_time-Grenze der Recorder-API
    // kann den Januar-Eintrag des FOLGEJAHRS mitliefern (siehe _fetchYear).
    const points = (result?.[entity] ?? []).filter(p => new Date(p.start).getFullYear() === year);
    if (points.length === 0) return null;
    const total = points.reduce((acc, p) => acc + (typeof p.change === 'number' && p.change >= 0 ? p.change : 0), 0);
    return total > 0 ? total : null;
  }

  // Bereichszuordnung aus der Registry. Die drei list-Kommandos brauchen
  // keine Adminrechte (anders als create/update/delete), sind aber nicht
  // Teil des hass-Objekts und muessen einzeln geholt werden. Eine Entity
  // haengt entweder direkt an einem Bereich oder ueber ihr Geraet.
  async _loadAreas() {
    if (this._areaOf) return this._areaOf;
    if (this._areaLoading) return null;
    this._areaLoading = true;
    try {
      this._areaOf = await lutarymLoadAreas(this._hass);
      return this._areaOf;
    } catch (e) {
      // Aeltere Kerne oder eingeschraenkte Rechte: ohne Bereiche faellt die
      // Erkennung auf eine Zeile je Zaehler zurueck.
      console.warn('[energy-charts-by-lutarym] Bereichsregistry nicht lesbar', e);
      this._areaOf = null;
      this._areaFailed = true;
      return null;
    } finally {
      this._areaLoading = false;
    }
  }

  // Gewuenschte Spaltenzahl, begrenzt durch die verfuegbare Breite. Unter
  // etwa 220px je Spalte wird die Zeile unleserlich, deshalb faellt die
  // Karte auf schmalen Dashboards von selbst auf weniger Spalten zurueck -
  // dieselbe Abstufung wie bei der Temperaturlinie.
  _roomColumns() {
    const want = this._config?.roomsColumns || 1;
    if (want <= 1) return 1;
    const px = this._width || 0;
    if (!px) return want;                 // Breite noch unbekannt
    return Math.max(1, Math.min(want, Math.floor(px / 220)));
  }

  // Die tatsaechlich anzuzeigenden Raeume. Bei aktiver Automatik ersetzt
  // die Erkennung die konfigurierte Liste; das Ergebnis wird gepuffert und
  // nur neu ermittelt, wenn sich Filter, Referenz-Entities oder die Zahl
  // der bekannten Entities aendern.
  _effectiveRooms() {
    const cfg = this._config;
    // Manuell gepflegte Raeume haben je eine Entity; intern arbeitet alles
    // mit Listen, damit ein Bereich mehrere Zaehler buendeln kann.
    if (!cfg?.roomsAuto) {
      return (cfg?.rooms || []).map(r => ({
        name: r.name,
        entities: r.entity ? [r.entity] : [],
        power_entities: r.power_entity ? [r.power_entity] : [],
      }));
    }
    if (!this._hass?.states) return [];
    const sig = [cfg.autoInclude, cfg.autoExclude, cfg.total_entity,
                 cfg.pvEntity, cfg.feedinEntity,
                 this._areaOf ? this._areaOf.size : (this._areaFailed ? 'x' : '-'),
                 Object.keys(this._hass.states).length].join('|');
    if (this._autoSig !== sig) {
      this._autoSig = sig;
      this._autoRooms = lutarymDetectRooms(this._hass, {
        include: cfg.autoInclude,
        // Die Karte wertet Gesamt-, PV- und Einspeisezaehler bereits an
        // anderer Stelle aus. Als Raum gezaehlt wuerden sie die Anteile
        // unbrauchbar machen.
        exclude: [cfg.autoExclude, cfg.total_entity, cfg.pvEntity, cfg.feedinEntity]
          .filter(Boolean).join(','),
        areaOf: this._areaOf,
        flatFallback: this._areaFailed === true,
      });
    }
    return this._autoRooms || [];
  }

  async _fetchRooms() {
    if (!this._hass) return;
    if (this._roomsLoading) return;
    // Bereichszuordnung muss vor der Erkennung stehen, sonst gruppiert der
    // erste Durchlauf noch nicht.
    if (this._config?.roomsAuto && !this._areaOf && !this._areaFailed) {
      await this._loadAreas();
      this._autoSig = null;
    }
    if (!this._config?.total_entity && !this._effectiveRooms().length) return;
    this._roomsLoading = true;
    this._lastFetch = Date.now();
    try {
      const roomList = this._effectiveRooms();
      const wantPv = !!(this._config.total_entity && this._config.pvEntity && this._config.feedinEntity);
      // Referenzzaehler und saemtliche Raumzaehler in einem Aufruf.
      const refs = [this._config.total_entity,
                    wantPv ? this._config.pvEntity : '',
                    wantPv ? this._config.feedinEntity : ''].filter(Boolean);
      const kwh = await this._roomsYearKwhBatch(
        [...refs, ...roomList.flatMap(r => r.entities)]);
      const grid = this._config.total_entity ? (kwh.get(this._config.total_entity) ?? null) : null;
      const pv   = wantPv ? (kwh.get(this._config.pvEntity) ?? null) : null;
      const feed = wantPv ? (kwh.get(this._config.feedinEntity) ?? null) : null;
      // Ein Raum kann mehrere Zaehler buendeln; null heisst "keine Daten",
      // deshalb wird erst summiert, wenn wenigstens einer Werte liefert.
      const roomKwh = roomList.map(r => {
        let sum = null;
        for (const id of r.entities) {
          const v = kwh.get(id);
          if (v != null) sum = (sum ?? 0) + v;
        }
        return sum;
      });
      // True house consumption = grid import + PV self-consumed (PV − feed-in).
      let totalKwh = grid;
      let pvSelf = null;
      if (wantPv && grid !== null && pv !== null && feed !== null) {
        pvSelf = Math.max(0, pv - feed);
        totalKwh = Math.max(0, grid + pvSelf);
      }
      this._roomsData = {
        total: totalKwh,
        hasTotal: !!this._config.total_entity,
        grid: wantPv ? grid : null,
        pvSelf,
        // name und power_entity mitfuehren: die Zuordnung ueber den Index
        // brach, sobald im Editor waehrend des laufenden Abrufs ein Raum
        // eingefuegt oder entfernt wurde.
        rooms: roomList.map((r, i) => ({
          name: r.name, power_entities: r.power_entities, kwh: roomKwh[i],
        })),
      };
    } catch (e) {
      this._roomsData = { error: t(this._hass, 'rmWsError', { msg: e.message }) };
    } finally {
      this._roomsLoading = false;
      this._render();
    }
  }

  _yearFraction() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end   = new Date(now.getFullYear() + 1, 0, 1);
    return (now - start) / (end - start);
  }

  _ovFmt(v, minD, maxD) {
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: minD,
      maximumFractionDigits: maxD ?? minD,
    });
  }

  async _fetchData() {
    // Sofort stempeln: sonst sieht das gleich folgende hass-Update noch
    // _lastFetch === 0 und startet denselben Abruf ein zweites Mal.
    this._lastFetch = Date.now();
    // Laufnummer gegen Wettlaeufe: wechselt der Nutzer im Editor schnell
    // Typ oder Entity, laufen mehrere Abrufe parallel und der zuerst
    // gestartete koennte zuletzt antworten und die neueren Daten ueberschreiben.
    const runId = (this._fetchRun = (this._fetchRun || 0) + 1);
    this._loading = true;
    this._error   = null;
    this._render();

    const currentYear = new Date().getFullYear();
    const yearsBack    = this._config.yearsBack;
    // oldest first, current year last — so bars are arranged from left
    // (oldest year) to right (current year).
    const years = [];
    for (let y = currentYear - yearsBack; y <= currentYear; y++) years.push(y);

    const ratioMode = this._preset.isRatio && this._config.gridEntity ? this._preset.ratioMode : null;
    // marginal_hourly und quotient_monthly holen ihre Daten komplett selbst -
    // die Monatsreihe der Haupt-Entity wuerde dort ungenutzt verworfen.
    const needsBaseSeries = ratioMode === null || ratioMode === 'complement_monthly';
    const ratioTotals = years.map(() => null);

    try {
      const results = needsBaseSeries
        ? await Promise.all(years.map(y => this._fetchYear(y)))
        : [];
      if (runId !== this._fetchRun) return; // ueberholt - Ergebnis verwerfen
      this._seriesYears = years;
      // Efficiency preset (wallbox_eff): grid-free share of the charging,
      // computed the marginal way per HOUR (both sensors are cumulative kWh
      // and HA keeps their hourly "change" forever, exact — not averaged):
      //   netzfrei_h = max(0, wallbox_h − hausbezug_h)   per hour
      //   month %    = Σ netzfrei_h / Σ wallbox_h · 100
      // i.e. when the wallbox drew more than the grid imported in that hour,
      // the surplus came from PV/self. Whole-house grid import bigger than the
      // charging ⇒ that hour counts as fully grid. If the grid entity is a
      // POWER sensor instead of energy, its hourly mean is converted to import
      // energy first. All in the card — no template, no extra sensor.
      if (ratioMode === 'marginal_hourly') {
        const gridIsPower = this._entityIsPower(this._config.gridEntity);
        this._seriesData = await Promise.all(years.map(async (y, yi) => {
          const [wbHours, gridHours] = await Promise.all([
            this._fetchEnergyHours(this._config.entity, y),
            gridIsPower
              ? this._fetchPowerImportHours(this._config.gridEntity, y)
              : this._fetchEnergyHours(this._config.gridEntity, y),
          ]);
          const free  = new Array(12).fill(0);
          const total = new Array(12).fill(0);
          const seen  = new Array(12).fill(false);
          let freeYear = 0, totalYear = 0;
          for (const [key, wb] of wbHours) {
            if (!(wb > 0)) continue;
            const g = gridHours.get(key) || 0;
            const m = new Date(key).getMonth();
            const f = Math.max(0, wb - g);
            free[m]  += f;
            total[m] += wb;
            seen[m]   = true;
            freeYear  += f;
            totalYear += wb;
          }
          ratioTotals[yi] = { num: freeYear, den: totalYear };
          return total.map((t, m) =>
            seen[m] && t > 0 ? Math.max(0, Math.min(100, (free[m] / t) * 100)) : null
          );
        }));
      } else if (this._preset.isRatio && this._config.gridEntity && this._preset.ratioMode === 'quotient_monthly') {
        // COP/JAZ: thermal produced / electricity consumed per month.
        // Numerator can be one OR two thermal sources (e.g. heating + DHW) so
        // its scope matches a whole-WP electricity meter (Shelly). Power (W)
        // sources are integrated to kWh from hourly means; energy (kWh) sources
        // use monthly change. Denominator likewise (Shelly kWh → monthly change).
        const heatEntities = [this._config.gridEntity];
        if (this._config.heatEntity2) heatEntities.push(this._config.heatEntity2);
        const [elec, heatParts] = await Promise.all([
          Promise.all(years.map(y => this._fetchMonthlyEnergy(this._config.entity, y))),
          Promise.all(years.map(y =>
            Promise.all(heatEntities.map(e => this._fetchMonthlyEnergy(e, y)))
          )),
        ]);
        this._seriesData = years.map((_, yi) => {
          let heatYear = 0, elecYear = 0;
          const months = new Array(12).fill(null).map((_, m) => {
            const e = elec[yi]?.[m];
            let h = null;
            for (const part of heatParts[yi]) {
              const v = part?.[m];
              if (v != null) h = (h ?? 0) + v;
            }
            if (e == null || e <= 0 || h == null || h <= 0) return null;
            heatYear += h;
            elecYear += e;
            return h / e;
          });
          // Jahreswert ist die Jahresarbeitszahl Sigma Waerme / Sigma Strom,
          // nicht der Durchschnitt der zwoelf Monats-COPs.
          ratioTotals[yi] = { num: heatYear, den: elecYear };
          return months;
        });
      } else if (ratioMode === 'complement_monthly') {
        // complement_monthly (self-consumption): (entity − other) / entity · 100,
        // both directly-metered energy sensors, monthly.
        const other = await Promise.all(years.map(y => this._fetchYear(y, this._config.gridEntity)));
        if (runId !== this._fetchRun) return;
        this._seriesData = results.map((denYear, yi) => {
          let pvYear = 0, selfYear = 0;
          const months = denYear.map((den, m) => {
            const o = other[yi]?.[m];
            if (den == null || den <= 0 || o == null) return null;
            const used = Math.max(0, Math.min(den, den - o));
            pvYear   += den;
            selfYear += used;
            return (used / den) * 100;
          });
          ratioTotals[yi] = { num: selfYear, den: pvYear };
          return months;
        });
      } else {
        this._seriesData = results;
      }

      if (this._preset.supportsPeakPower && this._config.powerEntity) {
        this._peakPowerData = await Promise.all(years.map(y => this._fetchPeakPower(y)));
      } else {
        this._peakPowerData = [];
      }

      if (this._preset.supportsDistanceLine && this._config.distanceEntity) {
        this._distanceData = await Promise.all(years.map(y => this._fetchDistance(y)));
      } else {
        this._distanceData = [];
      }

      this._temperatureDaily   = [];
      this._temperatureMonthly = [];
      if (runId !== this._fetchRun) return;
      if (this._preset.supportsTemperatureLine && this._config.temperatureEntity) {
        if (this._config.tempMode === 'daily') {
          // Current year only — fetching+rendering daily points for every
          // comparison year as well would be a lot of visual noise on top
          // of the bars, which already do the year-to-year comparison job.
          this._temperatureDaily = await this._fetchTemperatureDaily(currentYear);
        } else {
          this._temperatureMonthly = await Promise.all(years.map(y => this._fetchTemperatureMonthly(y)));
        }
      }
      this._ratioTotals = ratioTotals;
    } catch (err) {
      if (runId !== this._fetchRun) return;
      console.error('[energy-charts-by-lutarym]', err);
      this._error = err?.message ?? t(this._hass, 'unknownError');
    }

    if (runId !== this._fetchRun) return;
    this._loading = false;
    this._render();
  }

  // ── Helpers ───────────────────────────────────────────────────────

  _niceMax(val) {
    if (val <= 0) return 100;
    const mag = Math.pow(10, Math.floor(Math.log10(val)));
    for (const n of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
      if (n * mag >= val) return n * mag;
    }
    return 10 * mag;
  }

  // Like _niceMax, but for axes that need an explicit min too (e.g. outdoor
  // temperature, which regularly goes negative in winter) — pads a little
  // and rounds both ends to the nearest 5.
  _niceRange(minVal, maxVal) {
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return [0, 20];
    const span = Math.max(maxVal - minVal, 2);
    const pad  = Math.max(span * 0.15, 2);
    let lo = Math.floor((minVal - pad) / 5) * 5;
    let hi = Math.ceil((maxVal + pad) / 5) * 5;
    if (lo === hi) { lo -= 5; hi += 5; }
    return [lo, hi];
  }

  _layoutParams(px) {
    let lp;
    if (px < 280) {
      lp = { H: 160, pad: { top: 18, right: 6, bottom: 24, left: 34 },
             monthStyle: 'initial', barRatio: 0.7 };
    } else if (px < 420) {
      lp = { H: 185, pad: { top: 22, right: 8, bottom: 28, left: 42 },
             monthStyle: 'abbr', barRatio: 0.72 };
    } else if (px < 560) {
      lp = { H: 210, pad: { top: 24, right: 10, bottom: 30, left: 48 },
             monthStyle: 'abbr', barRatio: 0.74 };
    } else {
      lp = { H: 230, pad: { top: 28, right: 14, bottom: 34, left: 54 },
             monthStyle: 'abbr', barRatio: 0.76 };
    }
    return lp;
  }

  // Continuous scaling of the label font size based on the actual card
  // width AND height (instead of fixed steps) — text grows/shrinks
  // smoothly as the card is resized. A manually set label font size
  // (label_font_size) still overrides this fixed value.
  _labelFontSizes(px, H, defaultH) {
    if (this._config.labelFontSize) {
      const f = this._config.labelFontSize;
      return { fMonth: f, fAxis: f, fVal: f };
    }

    const widthScale  = px / 400;
    const heightScale = H / defaultH;
    const scale = Math.min(Math.max(Math.sqrt(widthScale * heightScale), 0.6), 2.2);

    const fMonth = Math.round(9 * scale);
    const fAxis  = Math.round(9 * scale);
    const fVal   = px < 240 ? 0 : Math.round(8 * scale);

    return { fMonth, fAxis, fVal };
  }

  // Estimates how many lines the ".totals" summary row will wrap onto, so
  // the reserved overhead height stays accurate however many years (and
  // however long their Ø/min–max text) are shown. Without this, a card
  // configured with e.g. all 4 years wraps onto 2 lines but the layout still
  // only reserves room for 1 — pushing the chart (and its month labels)
  // outside the card.
  _totalsRowCount(px) {
    const showTotal = px === 0 || px >= 280;
    if (!showTotal) return 0;

    const years = this._seriesYears;
    const N = years.length || Math.max(1, (this._config.yearsBack ?? 1) + 1);
    const availW = Math.max((px || 400) - 28, 80); // minus the card's left/right padding

    let itemTexts;
    if (this._seriesData && this._seriesData.length === N) {
      itemTexts = years.map((yr, idx) => `${yr}: ${this._formatSummary(this._summary(this._seriesData[idx] || [], idx))}`);
    } else {
      // Data not loaded yet — assume the longest format this card ever
      // emits (range-mode Ø/min/max) so reserved space is never too small.
      itemTexts = Array.from({ length: N }, () => '0000: Ø 100% (100–100%)');
    }

    const charW   = 12 * 0.56; // ~px per character at the totals row's 12px font
    const dotGap  = 14;        // color dot + its gap to the text
    const itemGap = 16;        // gap between items (matches the CSS gap)

    let rowW = 0, rows = 1;
    itemTexts.forEach(text => {
      const itemW = dotGap + text.length * charW;
      const advance = itemW + (rowW > 0 ? itemGap : 0);
      if (rowW > 0 && rowW + advance > availW) {
        rows++;
        rowW = itemW;
      } else {
        rowW += advance;
      }
    });
    return rows;
  }

  // Height of title + summary row + chart padding — everything except the
  // actual chart. Needed to know how much of the total available card
  // height remains for the chart itself.
  _nonChartOverhead(px) {
    const titleFontSize = this._config.titleFontSize || 14;
    const headerH = 14 + titleFontSize * 1.3 + 2; // padding-top + line height + padding-bottom
    const rows = this._totalsRowCount(px);
    // row height + row-gap between wrapped rows + top/bottom padding
    const totalsH = rows > 0 ? (rows * 18 + (rows - 1) * 4 + 14) : 0;
    const chartPaddingBottom = 10;
    return headerH + totalsH + chartPaddingBottom;
  }

  // Effective chart height: follows the card height measured by the
  // ResizeObserver (this._height) once known — e.g. when the card is
  // resized taller/shorter in a Sections/grid dashboard. Without a
  // known/external height (classic Masonry dashboard) the responsive
  // breakpoint default is used instead.
  _effectiveChartHeight(defaultH, px) {
    if (!this._height) return defaultH;
    const overhead = this._nonChartOverhead(px);
    const available = this._height - overhead;
    const MIN_CHART_H = 100;
    return Math.max(MIN_CHART_H, Math.round(available));
  }

  // Color for a given year series: the last series (current year) uses
  // "color", the second-to-last (immediate previous year) uses "colorPrev"
  // unchanged, further-back years use increasingly transparent variants of
  // colorPrev so they stand out clearly from the previous year.
  _seriesColor(index, total) {
    const isCurrent = index === total - 1;
    if (isCurrent) return this._config.color;
    const distance = total - 1 - index; // 1 = immediate previous year, 2/3 = further back
    const FADE = { 1: '', 2: 'aa', 3: '77' };
    // Ueber lutarymWithAlpha, weil ein blosses Anhaengen nur bei sechs-
    // stelligem Hex funktioniert: aus "#888" wuerde "#888aa" und aus "grey"
    // "greyaa" - beides ungueltig, der Balken bliebe unsichtbar.
    return lutarymWithAlpha(this._config.colorPrev, FADE[distance] ?? '77');
  }

  // Blends a hex color with white to produce a pale preview/fallback
  // variant (e.g. for the "muted color" preview swatch in the editor,
  // since <input type="color"> can't represent transparency).
  static blendWithWhite(hex, alpha) {
    // Kurzform (#abc) zuerst ausschreiben, sonst liefert substring(4,6) ''
    // und parseInt daraus NaN - das Feld zeigte dann '#ff0fNaN'.
    const norm = lutarymNormHex(hex);
    if (!norm) return '#cccccc'; // benannte Farbe / rgb(): kein Hex ableitbar
    const h = norm.slice(1);
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const mix = c => Math.round(c * alpha + 255 * (1 - alpha));
    return '#' + [mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ── SVG chart ─────────────────────────────────────────────────────────

  _renderOverview() {
    const hass = this._hass;
    const cfg  = this._config;
    const data = this._overviewData;
    // Freitextfelder werden per Template-String ins Markup geschrieben -
    // ohne Escaping zerlegt ein "&" oder "<" im Titel die Karte.
    const currency = lutarymEsc(cfg.currency || 'EUR');
    const year = new Date().getFullYear();
    const titleText = lutarymEsc(cfg.title || t(hass, 'ovDefaultTitle'));

    let inner;
    if (!cfg.energy_entity) {
      inner = `<div class="ov-hero">…</div><div class="ov-sub">${t(hass, 'notConfigured')}</div>`;
    } else if (!data) {
      inner = `<div class="ov-hero">…</div><div class="ov-sub">${t(hass, 'ovLoadingData')}</div>`;
    } else if (data.error) {
      inner = `<div class="ov-hero">!</div><div class="ov-sub">${lutarymEsc(data.error)}</div>`;
    } else {
      const current  = data.current;
      const previous = data.previous;
      const previousYtd = data.previousYtd;
      const price    = Number(cfg.price_per_kwh) || 0;
      const fraction = this._yearFraction();

      let baseFeeYearly = 0;
      if      (cfg.base_fee_yearly  != null && cfg.base_fee_yearly  !== '') baseFeeYearly = Number(cfg.base_fee_yearly);
      else if (cfg.base_fee_monthly != null && cfg.base_fee_monthly !== '') baseFeeYearly = Number(cfg.base_fee_monthly) * 12;
      const baseFee    = (cfg.base_fee_mode === 'full') ? baseFeeYearly : baseFeeYearly * fraction;
      const energyCost = current * price;
      const totalCost  = energyCost + baseFee;

      const rows = [];
      rows.push(`<div class="ov-row"><span>${t(hass, 'ovEnergyLabel', { kwh: this._ovFmt(current,0,1), price: this._ovFmt(price,2,4), currency })}</span><span>${this._ovFmt(energyCost,2)} ${currency}</span></div>`);
      if (baseFeeYearly > 0) {
        const bl = (cfg.base_fee_mode === 'full') ? t(hass,'ovBaseFeeYear') : t(hass,'ovBaseFeeAccrued');
        rows.push(`<div class="ov-row"><span>${bl}</span><span>${this._ovFmt(baseFee,2)} ${currency}</span></div>`);
      }

      // Verglichen wird gegen den GLEICHEN Zeitraum des Vorjahres. Ein
      // Vergleich gegen das volle Vorjahr waere systematisch verzerrt: er
      // zeigte unterjaehrig immer ein Minus, egal wie sich der Verbrauch
      // entwickelt hat.
      let compareHtml = '';
      if (previousYtd !== null && previousYtd > 0) {
        const diff = current - previousYtd;
        const pct  = (diff / previousYtd) * 100;
        const less = diff < 0;
        compareHtml = `<div class="ov-compare ${less ? 'down' : 'up'}">${less ? '▼' : '▲'} ${this._ovFmt(Math.abs(pct),1)} % ${less ? t(hass,'ovLess') : t(hass,'ovMore')} (${this._ovFmt(Math.abs(diff),0,1)} kWh) <span class="ov-cmpnote">${t(hass,'ovVsSamePeriod',{ year: year-1 })}</span></div>`;
      } else {
        compareHtml = `<div class="ov-compare">${t(hass,'ovNoDataForYear',{ year: year-1 })}</div>`;
      }
      const prevText = (previous !== null && previous > 0) ? `${this._ovFmt(previous,0,1)} kWh` : '–';

      const noteHtml = data.partialYear ? `<div class="ov-note">${t(hass,'ovPartialYearNote')}</div>` : '';
      inner = `
        <div class="ov-hero">${this._ovFmt(totalCost,2)} ${currency}</div>
        <div class="ov-sub">${t(hass,'ovCostLabel',{ year })}</div>
        <div class="ov-breakdown">${rows.join('')}</div>
        <div class="ov-divider"></div>
        <div class="ov-cons">
          <div><div class="ov-collabel">${t(hass,'ovConsumptionLabel',{ year })}</div><div class="ov-consval">${this._ovFmt(current,0,1)} kWh</div></div>
          <div class="ov-right"><div class="ov-collabel">${t(hass,'ovPreviousYearLabel',{ year: year-1 })}</div><div class="ov-consval sec">${prevText}</div></div>
        </div>
        ${compareHtml}
        ${noteHtml}
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>
        /* Keine feste Hoehe: overview und rooms bestimmen ihre Hoehe aus
           dem Inhalt, passend zu rows:'auto'. min-height fuellt den Platz,
           wenn doch eine feste Zeilenzahl vorgegeben ist, statt den Inhalt
           abzuschneiden. */
        :host { display:block; width:100%; box-sizing:border-box; ${this._appearanceCSSVars()} }
        ha-card { width:100%; min-height:100%; box-sizing:border-box; padding:16px 18px; }
        .ov-title { font-size:${cfg.titleFontSize}px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:var(--secondary-text-color); margin-bottom:14px; }
        .ov-hero { font-size:2.4rem; font-weight:600; line-height:1.05; color:var(--primary-text-color); font-variant-numeric:tabular-nums; }
        .ov-sub { font-size:.8rem; color:var(--secondary-text-color); margin-top:3px; }
        .ov-breakdown { margin-top:14px; }
        .ov-row { display:flex; justify-content:space-between; gap:12px; padding:3px 0; font-size:.9rem; }
        .ov-row span:first-child { color:var(--secondary-text-color); }
        .ov-row span:last-child { color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .ov-divider { height:1px; background:var(--divider-color, rgba(128,128,128,.2)); margin:14px 0; }
        .ov-cons { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
        .ov-right { text-align:right; }
        .ov-collabel { font-size:.75rem; color:var(--secondary-text-color); margin-bottom:2px; }
        .ov-consval { font-size:1.55rem; font-weight:600; color:var(--primary-text-color); font-variant-numeric:tabular-nums; line-height:1.1; }
        .ov-consval.sec { font-size:1.05rem; font-weight:500; color:var(--secondary-text-color); }
        .ov-compare { margin-top:8px; font-size:.9rem; font-weight:600; font-variant-numeric:tabular-nums; color:var(--secondary-text-color); }
        .ov-compare.down { color:var(--success-color, #2e7d32); }
        .ov-compare.up { color:var(--error-color, #c62828); }
        .ov-cmpnote { font-weight:400; font-size:.78rem; color:var(--secondary-text-color); }
        .ov-note { font-size:.75rem; color:var(--secondary-text-color); margin-top:6px; font-style:italic; }
      </style>
      <ha-card>
        <div class="ov-title">${titleText}</div>
        ${inner}
      </ha-card>`;
  }

  _renderRooms() {
    this._roomsLastRender = Date.now();
    const hass = this._hass;
    const cfg  = this._config;
    const data = this._roomsData;
    const year = new Date().getFullYear();
    const accent = lutarymSafeColor(cfg.color, '#03a9f4');
    const cols = this._roomColumns();
    // Senkrechte Trenner zwischen den Spalten. Das Raster fuellt zeilenweise,
    // die zweite Spalte sind also die Elemente 2, 2+cols, 2+2*cols und so
    // weiter.
    const colSep = cols > 1
      ? Array.from({ length: cols - 1 }, (_, i) =>
          `.rm-rows > .rm-row:nth-child(${cols}n+${i + 2}) { border-left:1px solid var(--divider-color, rgba(128,128,128,.18)); padding-left:16px; }`
        ).join('\n        ')
      : '';
    const titleText = lutarymEsc(cfg.title || t(hass, 'rmDefaultTitle'));
    const fmt = (v, a, b) => Number(v).toLocaleString(undefined, { minimumFractionDigits: a, maximumFractionDigits: b ?? a });

    let totalStr = '…';
    let rowsHtml = '';
    let otherHtml = '';
    let splitHtml = '';
    let shareHtml = '';

    // Segmentfarben des Gesamtbalkens. Der goldene Winkel verteilt die
    // Farbtoene gleichmaessig ueber den Kreis, die wechselnde Helligkeit
    // haelt zusaetzlich benachbarte Segmente auseinander - Farbe allein
    // reicht nicht, wenn jemand Farben schlecht unterscheidet.
    const segColor = (i) => {
      const hue = Math.round((i * 137.508) % 360);
      const sat = [64, 72, 50][i % 3];
      const lig = [56, 43, 68][i % 3];
      return `hsl(${hue}, ${sat}%, ${lig}%)`;
    };

    const roomsCfg = this._effectiveRooms();
    if (!cfg.total_entity && !roomsCfg.length) {
      rowsHtml = `<div class="rm-empty">${t(hass, 'notConfigured')}</div>`;
    } else if (data && data.error) {
      totalStr = '!';
      rowsHtml = `<div class="rm-empty">${lutarymEsc(data.error)}</div>`;
    } else if (data) {
      const hasTotal = !!data.hasTotal && data.total !== null;
      const roomSum  = (data.rooms || []).reduce((a, r) => a + (r.kwh ?? 0), 0);
      // Base for percentages: real total when given, else the sum of rooms.
      const base = hasTotal ? data.total : (roomSum > 0 ? roomSum : null);
      // Big number: total when given, else the rooms' sum.
      const heroVal = hasTotal ? data.total : roomSum;
      totalStr = (heroVal !== null && heroVal !== undefined) ? fmt(heroVal, 0, 1) : '–';
      this._rmHeroLabel = hasTotal ? t(hass, 'rmTotalLabel', { year }) : t(hass, 'rmRoomsSumLabel', { year });
      if (hasTotal && data.grid !== null && data.pvSelf !== null) {
        splitHtml = `
          <div class="rm-headcell"><div class="rm-totlabel">${t(hass, 'rmGridLabel')}</div><div class="rm-headval" style="color:var(--error-color, #c62828)">${fmt(data.grid, 0, 1)}<span class="rm-totunit">kWh</span></div></div>
          <div class="rm-headcell"><div class="rm-totlabel">${t(hass, 'rmPvUsedLabel')}</div><div class="rm-headval" style="color:var(--success-color, #2e7d32)">${fmt(data.pvSelf, 0, 1)}<span class="rm-totunit">kWh</span></div></div>`;
      }
      // "Other" is only meaningful with a real total meter: total − listed rooms.
      const hasRooms = !!(data.rooms && data.rooms.length);
      const other = (hasTotal && hasRooms) ? Math.max(0, data.total - roomSum) : null;

      // Die Balkenlaenge richtet sich nach dem groessten Eintrag, nicht nach
      // dem Gesamtverbrauch. Sonst sind fast alle Balken gleich kurz und der
      // Vergleich zwischen den Raeumen ist nicht mehr zu sehen.
      const maxVal = Math.max(0, other ?? 0, ...(data.rooms || []).map(r => r.kwh ?? 0));
      const bar = (v, muted) => {
        const w = (maxVal > 0 && v !== null && v !== undefined) ? Math.min(100, (v / maxVal) * 100) : 0;
        return `<div class="rm-bar${muted ? ' rm-otherbar' : ''}" style="width:${w}%${muted ? '' : `;background:${accent}`}"></div>`;
      };

      // Nach Jahresverbrauch sortieren, groesster zuerst; Raeume ohne
      // Daten (null) stehen hinten.
      const paired = (data.rooms || []).slice()
        .sort((a, b) => (b.kwh ?? -1) - (a.kwh ?? -1));

      rowsHtml = paired.map(room => {
        // Ein Bereich kann mehrere Leistungssensoren haben; angezeigt wird
        // ihre Summe.
        let wattHtml = '';
        let watt = null;
        for (const pe of room.power_entities || []) {
          const w = parseFloat(hass?.states?.[pe]?.state);
          if (Number.isFinite(w)) watt = (watt ?? 0) + w;
        }
        if (watt !== null) {
          wattHtml = `<span class="rm-watt">${fmt(watt, 0, 1)} W</span>`;
        }
        let kwhStr = '–', kwhUnit = '', pctStr = '', pct = 0;
        if (room.kwh !== null) {
          kwhStr = fmt(room.kwh, 0, 1);
          kwhUnit = 'kWh';
          if (base && base > 0) { pct = (room.kwh / base) * 100; pctStr = fmt(pct, 1) + ' %'; }
        }
        return `<div class="rm-row">
          <div class="rm-line">
            <span class="rm-name">${lutarymEsc(room.name)}</span>${wattHtml}
            <span class="rm-sp"></span>
            <span class="rm-kwh">${kwhStr}</span><span class="rm-unit">${kwhUnit}</span>
            <span class="rm-pct">${pctStr}</span>
          </div>
          ${bar(room.kwh)}
        </div>`;
      }).join('');

      let oKwh = '–', oUnit = '', oPct = '';
      if (other !== null && data.total > 0) {
        oKwh = fmt(other, 0, 1); oUnit = 'kWh'; oPct = fmt((other / data.total) * 100, 1) + ' %';
      }
      otherHtml = (hasTotal && hasRooms) ? `<div class="rm-row rm-other">
        <div class="rm-line">
          <span class="rm-name">${t(hass, 'rmOtherLabel')}</span>
          <span class="rm-sp"></span>
          <span class="rm-kwh">${oKwh}</span><span class="rm-unit">${oUnit}</span>
          <span class="rm-pct">${oPct}</span>
        </div>
        ${bar(other, true)}
      </div>` : '';

      // Gesamtbalken: alle Anteile nebeneinander in einem Streifen, darunter
      // die Zuordnung Farbe zu Raum. Die Prozentwerte stehen schon in den
      // Zeilen, deshalb nur Punkt und Name.
      const segs = [];
      if (base && base > 0) {
        paired.forEach((room, i) => {
          if (room.kwh === null || room.kwh <= 0) return;
          segs.push({ name: room.name, pct: (room.kwh / base) * 100, color: segColor(i) });
        });
      }
      if (other !== null && other > 0 && data.total > 0) {
        segs.push({ name: t(hass, 'rmOtherLabel'), pct: (other / data.total) * 100,
                    color: 'var(--secondary-text-color)' });
      }
      if (segs.length) {
        shareHtml = `<div class="rm-share">
          <div class="rm-sharebar">${segs.map(s =>
            `<div class="rm-seg" style="width:${s.pct}%;background:${s.color}" title="${lutarymEsc(s.name)} ${fmt(s.pct, 1)} %"></div>`
          ).join('')}</div>
          <div class="rm-legend">${segs.map(s =>
            `<span class="rm-leg"><i style="background:${s.color}"></i>${lutarymEsc(s.name)}</span>`
          ).join('')}</div>
        </div>`;
      }
    } else {
      rowsHtml = roomsCfg.map(r => `<div class="rm-row">
          <div class="rm-line">
            <span class="rm-name">${lutarymEsc(r.name)}</span>
            <span class="rm-sp"></span>
            <span class="rm-kwh">…</span>
          </div>
          <div class="rm-bar"></div>
        </div>`).join('');
    }

    this.shadowRoot.innerHTML = `
      <style>
        /* Keine feste Hoehe: overview und rooms bestimmen ihre Hoehe aus
           dem Inhalt, passend zu rows:'auto'. min-height fuellt den Platz,
           wenn doch eine feste Zeilenzahl vorgegeben ist, statt den Inhalt
           abzuschneiden. */
        :host { display:block; width:100%; box-sizing:border-box; ${this._appearanceCSSVars()} }
        ha-card { width:100%; min-height:100%; box-sizing:border-box; padding:16px 18px; }
        .rm-title { font-size:${cfg.titleFontSize}px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:var(--secondary-text-color); margin-bottom:14px; }
        .rm-totlabel { font-size:.78rem; color:var(--secondary-text-color); margin-bottom:2px; }
        .rm-totval { font-size:1.7rem; font-weight:600; line-height:1.05; color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .rm-totunit { font-size:.8rem; color:var(--secondary-text-color); margin-left:4px; }
        .rm-divider { height:1px; background:var(--divider-color, rgba(128,128,128,.2)); margin:14px 0; }
        .rm-head { display:flex; gap:18px; align-items:flex-end; flex-wrap:wrap; }
        .rm-headcell { display:flex; flex-direction:column; }
        .rm-headval { font-size:1.2rem; font-weight:600; color:var(--primary-text-color); font-variant-numeric:tabular-nums; line-height:1.05; white-space:nowrap; }
        .rm-headval-main { font-size:1.7rem; }
        /* Ein Raster ueber die Raumzeilen. Bei einer Spalte verhaelt es
           sich wie die bisherige Liste. */
        /* Eine Zeile je Raum: Name links, Zahlen rechts, der Balken als
           duenne Linie darunter. Keine graue Balkenspur und keine
           Zeilentrenner, das war der unruhige Teil. Getrennt werden nur
           die Spalten. */
        .rm-rows { display:grid; grid-template-columns:repeat(${cols}, minmax(0, 1fr)); column-gap:26px; }
        .rm-row { display:flex; flex-direction:column; gap:5px; padding:7px 0; min-width:0; }
        ${colSep}
        .rm-line { display:flex; align-items:baseline; gap:6px; min-width:0; }
        .rm-sp { flex:1 1 auto; }
        .rm-name { font-size:.9rem; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .rm-watt { font-size:.72rem; color:var(--secondary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .rm-kwh { font-size:.9rem; font-weight:600; color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .rm-unit { font-size:.7rem; color:var(--secondary-text-color); }
        .rm-pct { font-size:.78rem; color:var(--secondary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; min-width:44px; }
        .rm-bar { height:3px; border-radius:2px; background:${accent}; transition:width .4s ease; width:0%; }
        .rm-otherbar { background:var(--secondary-text-color); opacity:.45; }
        .rm-other { border-top:1px solid var(--divider-color, rgba(128,128,128,.2)); margin-top:6px; padding-top:9px; }
        .rm-other .rm-name { font-style:italic; color:var(--secondary-text-color); }
        .rm-empty { color:var(--secondary-text-color); font-size:.9rem; padding:8px 0; }
        /* Gesamtbalken ganz unten: ein Streifen ueber die volle Breite,
           je Raum ein Segment in eigener Farbe. */
        .rm-share { margin-top:14px; padding-top:14px; border-top:1px solid var(--divider-color, rgba(128,128,128,.2)); }
        .rm-sharebar { display:flex; height:12px; border-radius:6px; overflow:hidden; background:var(--divider-color, rgba(128,128,128,.2)); }
        .rm-seg { height:100%; min-width:1px; }
        .rm-legend { display:flex; flex-wrap:wrap; gap:5px 14px; margin-top:10px; }
        .rm-leg { display:inline-flex; align-items:center; gap:5px; font-size:.72rem; color:var(--secondary-text-color); white-space:nowrap; }
        .rm-leg i { width:8px; height:8px; border-radius:2px; flex:0 0 auto; }
      </style>
      <ha-card>
        <div class="rm-title">${titleText}</div>
        <div class="rm-head">
          <div class="rm-headcell"><div class="rm-totlabel">${this._rmHeroLabel || t(hass, 'rmTotalLabel', { year })}</div>
            <div class="rm-headval rm-headval-main"><span class="rm-totval">${totalStr}</span><span class="rm-totunit">kWh</span></div></div>
          ${splitHtml}
        </div>
        <div class="rm-divider"></div>
        <div class="rm-rows">${rowsHtml}</div>
        ${otherHtml}
        ${shareHtml}
      </ha-card>`;
  }

  _buildChart(currentMonth) {
    const lang = lutarymLang(this._hass);
    const MONTHS_ABBR_L    = MONTHS_ABBR[lang];
    const MONTHS_INITIAL_L = MONTHS_INITIAL[lang];

    const px = this._width || 400;
    const lp = this._layoutParams(px);
    const rangeMode = this._isRangeMode();
    const kwp = (this._preset.supportsCapacityLine && this._config.kwp) ? this._config.kwp : null;
    const hasPeakPower = !!(this._preset.supportsPeakPower && this._config.powerEntity);
    const hasTemperature = !!(this._preset.supportsTemperatureLine && this._config.temperatureEntity);
    const hasDistance = !!(this._preset.supportsDistanceLine && this._config.distanceEntity);
    // Graceful degradation: daily resolution needs real width, or it turns
    // into an illegible smear of ~365 points. Falls back to a monthly
    // min/max band first, then — on very narrow cards, where even that gets
    // cramped — down to a plain monthly average.
    let tempMode = hasTemperature ? this._config.tempMode : null;
    if (tempMode === 'daily' && px < 500) tempMode = 'minmax';
    if (tempMode && tempMode !== 'mean' && px < 280) tempMode = 'mean';
    // The kWp line, peak-power markers and distance-driven line are all
    // 0-based (kW/kWp/km); the outdoor-temperature line is in °C and needs a
    // real min too. Either way it's a different unit than the left axis, so
    // they share one right-hand scale — none of these combine on one preset,
    // so there's no clash between e.g. a kW scale and a km scale.
    const showRightAxis = kwp != null || hasPeakPower || hasTemperature || hasDistance;

    const { monthStyle, barRatio } = lp;
    const H = this._effectiveChartHeight(lp.H, px);
    const { fMonth, fAxis, fVal } = this._labelFontSizes(px, H, lp.H);

    // Reserve enough right-hand margin for the longest label actually drawn
    // there — a fixed pixel offset isn't enough since fAxis scales with card
    // width/height (a wider card gets bigger axis text, which needs more
    // room, or "14.4 kWp" clips and its trailing "p" silently disappears).
    let pad = lp.pad;
    if (showRightAxis) {
      const kwpLabelChars = kwp != null ? String(kwp).length : 0;
      const rightChars = Math.max(kwpLabelChars, 5); // room for tick labels like "17.5" or "-10" too
      const rightExtra = Math.ceil(rightChars * fAxis * 0.62) + 10;
      pad = { ...lp.pad, right: lp.pad.right + rightExtra };
    }

    const W     = px;
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const slotW = plotW / 12;

    const years  = this._seriesYears;
    const series = this._seriesData;
    const N      = Math.max(years.length, 1);
    const lastIndex = N - 1; // index of the current year (last series)

    // N bars per month side by side, with a small gap between them
    const gap      = slotW * (N > 2 ? 0.035 : 0.06);
    const totalGap = gap * (N - 1);
    const barW     = (slotW * barRatio - totalGap) / N;
    const groupW   = barW * N + totalGap;
    const groupOff = (slotW - groupW) / 2;

    const colorDim  = this._config.colorDim || lutarymWithAlpha(this._config.color, '55');
    const colorText = this._config.colorText || 'var(--primary-text-color)';

    // Max value priority:
    //   1. y_max (hard user override) — exact axis top, no rounding, every preset.
    //   2. fixed presets (autarkie/akku 0-100%) — stay 0-100 UNLESS the user
    //      explicitly sets a headroom, which switches them to data-zoom too.
    //   3. dynamic across all series with configurable headroom (default 20%).
    const explicitHeadroom = this._config.yHeadroom != null;
    const headroomFactor = 1 + (this._config.yHeadroom ?? 20) / 100;
    const peakOf = () => {
      if (rangeMode) {
        const allMax = series.flat().filter(v => v !== null).map(v => v.max).filter(v => v != null && v >= 0);
        return allMax.length ? Math.max(...allMax) : 0;
      }
      const allVals = series.flat().filter(v => v !== null && v >= 0);
      return allVals.length ? Math.max(...allVals) : 0;
    };
    let maxVal;
    if (this._config.yMax != null && this._config.yMax > 0) {
      maxVal = this._config.yMax;
    } else if (this._preset.fixedMax != null && !explicitHeadroom) {
      maxVal = this._preset.fixedMax;
    } else {
      maxVal = this._niceMax(peakOf() * headroomFactor);
    }

    // Right-axis scale. For kWp/peak-power it's 0-based (covers the static
    // kWp line and the measured monthly peaks, so a peak that slightly
    // exceeds the nameplate capacity still fits). For outdoor temperature it
    // needs a real min too, since winter months regularly go negative.
    // Monthly {mean,min,max} regardless of how the data was fetched — if
    // temp_mode is 'daily' but we're rendering a degraded monthly view,
    // derive it from the daily array instead of a second network request.
    const monthlyTempFor = yearIdx => {
      if (this._config.tempMode === 'daily') {
        return yearIdx === lastIndex ? EnergyChartsByLutarym.monthlyFromDaily(this._temperatureDaily) : [];
      }
      return this._temperatureMonthly[yearIdx] || [];
    };

    let rightMin = 0, rightMax = null;
    if (hasTemperature) {
      let tVals;
      if (tempMode === 'daily') {
        tVals = (this._temperatureDaily || []).map(p => p.value).filter(v => v != null);
      } else {
        const monthly = monthlyTempFor(lastIndex);
        tVals = monthly.flatMap(m => m ? [m.mean, m.min, m.max] : []).filter(v => v != null);
      }
      [rightMin, rightMax] = tVals.length ? this._niceRange(Math.min(...tVals), Math.max(...tVals)) : [-10, 20];
    } else if (showRightAxis) {
      const peakVals = hasPeakPower
        ? (this._peakPowerData || []).flat().filter(v => v != null && v >= 0)
        : [];
      const distanceVals = hasDistance
        ? (this._distanceData || []).flat().filter(v => v != null && v >= 0)
        : [];
      const candidates = kwp != null ? [...peakVals, kwp] : [...peakVals, ...distanceVals];
      rightMax = this._niceMax(candidates.length ? Math.max(...candidates) : (kwp || 1));
    }
    // Maps a right-axis value (kW/kWp, km, or °C) to its y coordinate.
    const yForRight = v => pad.top + plotH - ((v - rightMin) / (rightMax - rightMin)) * plotH;

    const TICKS = px < 280 ? 4 : 5;
    let grid = '', yLabels = '', yLabelsRight = '';
    for (let i = 0; i <= TICKS; i++) {
      const v = (maxVal / TICKS) * i;
      const y = pad.top + plotH - (v / maxVal) * plotH;
      grid    += `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${pad.left + plotW}" y2="${y.toFixed(1)}" stroke="var(--divider-color)" stroke-width="0.5" stroke-dasharray="4 3"/>`;
      yLabels += `<text x="${pad.left - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="${fAxis}" fill="var(--secondary-text-color)">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
    }
    if (showRightAxis) {
      for (let i = 0; i <= TICKS; i++) {
        const v = rightMin + ((rightMax - rightMin) / TICKS) * i;
        const y = yForRight(v);
        yLabelsRight += `<text x="${(pad.left + plotW + 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="start" font-size="${fAxis}" fill="var(--secondary-text-color)">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
      }
    }

    let bars = '', xLabels = '', valLabels = '';
    for (let m = 0; m < 12; m++) {
      const cx = pad.left + m * slotW + slotW / 2;
      const isFutureMonth = m > currentMonth; // only relevant for the current year

      for (let s = 0; s < N; s++) {
        const isCurrentSeries = s === lastIndex;
        const val = series[s] ? series[s][m] : null;
        const isFuture = isCurrentSeries && isFutureMonth;
        const xBar = pad.left + m * slotW + groupOff + s * (barW + gap);

        if (isFuture) {
          bars += `<rect x="${xBar.toFixed(1)}" y="${(pad.top + plotH - 3).toFixed(1)}" width="${barW.toFixed(1)}" height="3" fill="var(--divider-color)" rx="1"/>`;
          continue;
        }

        const isEmpty = val === null || (rangeMode && val.min == null && val.max == null && val.mean == null);
        if (isEmpty) {
          bars += `<rect x="${xBar.toFixed(1)}" y="${(pad.top + plotH - 1).toFixed(1)}" width="${barW.toFixed(1)}" height="1" fill="var(--divider-color)" rx="1"/>`;
          continue;
        }

        const isCurrentMonthOfCurrentSeries = isCurrentSeries && m === currentMonth;
        const fill = isCurrentSeries
          ? (isCurrentMonthOfCurrentSeries ? this._config.color : colorDim)
          : this._seriesColor(s, N);

        // The bar itself always starts at 0, exactly like every other card
        // type — in range mode its height is the monthly mean. Min/max is a
        // separate whisker overlay on the same (left) axis, not a change to
        // where the bar starts.
        const primaryVal = rangeMode ? (val.mean ?? 0) : val;
        const bH = Math.max((Math.max(primaryVal, 0) / maxVal) * plotH, 1);
        const bY = pad.top + plotH - bH;
        const barMonthLabel = monthStyle === 'initial' ? MONTHS_INITIAL_L[m] : MONTHS_ABBR_L[m];
        const barTooltip = EnergyChartsByLutarym.escAttr(this._tooltipText(barMonthLabel, years[s], val));
        // Invisible full-height hit area so hovering the empty space above a
        // short bar still shows the tooltip. It sits BEHIND the visible bar,
        // which is opaque and would otherwise swallow the pointer events over
        // its own area — so the visible bar carries the same class/tooltip
        // too, making the whole column one seamless hover target.
        bars += `<rect class="lut-tt" data-tooltip="${barTooltip}" x="${xBar.toFixed(1)}" y="${pad.top.toFixed(1)}" width="${barW.toFixed(1)}" height="${plotH.toFixed(1)}" fill="transparent"/>`;
        bars += `<rect class="lut-tt" data-tooltip="${barTooltip}" x="${xBar.toFixed(1)}" y="${bY.toFixed(1)}" width="${barW.toFixed(1)}" height="${bH.toFixed(1)}" fill="${fill}" rx="2"/>`;

        if (rangeMode) {
          const minV = val.min ?? primaryVal;
          const maxV = val.max ?? primaryVal;
          const yMin = pad.top + plotH - (Math.max(minV, 0) / maxVal) * plotH;
          const yMax = pad.top + plotH - (Math.max(maxV, 0) / maxVal) * plotH;
          const wx   = xBar + barW / 2;
          const capW = Math.max(barW * 0.4, 5);
          bars += `<line x1="${wx.toFixed(1)}" y1="${yMin.toFixed(1)}" x2="${wx.toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="${colorText}" stroke-width="1.5"/>`;
          bars += `<line x1="${(wx - capW / 2).toFixed(1)}" y1="${yMax.toFixed(1)}" x2="${(wx + capW / 2).toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="${colorText}" stroke-width="1.5"/>`;
          bars += `<line x1="${(wx - capW / 2).toFixed(1)}" y1="${yMin.toFixed(1)}" x2="${(wx + capW / 2).toFixed(1)}" y2="${yMin.toFixed(1)}" stroke="${colorText}" stroke-width="1.5"/>`;
          // No number label here — it read as belonging to the (black) whisker
          // rather than the (colored) bar. The summary line above the chart
          // already gives the exact Ø/min/max figures — and now the hover
          // tooltip on the bar itself does too.
        } else if (this._config.showValues && isCurrentSeries && fVal > 0 && primaryVal > 0) {
          // Value label only for the current year (otherwise too cluttered with multiple years)
          valLabels += `<text x="${(xBar + barW / 2).toFixed(1)}" y="${(bY - 3).toFixed(1)}" text-anchor="middle" font-size="${fVal}" fill="${colorText}">${primaryVal.toFixed(this._preset.decimals ?? 0)}${this._preset.valueSuffix}</text>`;
        }

        // Monthly peak power — a short tick per bar (not a line across the
        // whole year), positioned against the shared right kW axis.
        if (hasPeakPower) {
          const peakVal = this._peakPowerData[s] ? this._peakPowerData[s][m] : null;
          if (peakVal != null) {
            const yPeak = yForRight(Math.min(Math.max(peakVal, 0), rightMax));
            const tickW = Math.max(barW * 0.6, 5);
            const tx = xBar + barW / 2;
            const peakTooltip = EnergyChartsByLutarym.escAttr(`${barMonthLabel} ${years[s]}: ${t(this._hass, 'peakLabel')} ${peakVal.toFixed(1)} kW`);
            // Invisible wider hit line — the visible tick stays the same thin 2px mark.
            bars += `<line class="lut-tt" data-tooltip="${peakTooltip}" x1="${(tx - tickW / 2).toFixed(1)}" y1="${yPeak.toFixed(1)}" x2="${(tx + tickW / 2).toFixed(1)}" y2="${yPeak.toFixed(1)}" stroke="transparent" stroke-width="12" stroke-linecap="round"/>`;
            bars += `<line x1="${(tx - tickW / 2).toFixed(1)}" y1="${yPeak.toFixed(1)}" x2="${(tx + tickW / 2).toFixed(1)}" y2="${yPeak.toFixed(1)}" stroke="${colorText}" stroke-width="2" stroke-linecap="round" class="lut-tt" data-tooltip="${peakTooltip}"/>`;
          }
        }
      }

      const label  = monthStyle === 'initial' ? MONTHS_INITIAL_L[m] : MONTHS_ABBR_L[m];
      const isCurrentMonth = m === currentMonth;
      const weight = isCurrentMonth ? 'bold' : 'normal';
      const fcolor = isCurrentMonth ? colorText : 'var(--secondary-text-color)';
      xLabels += `<text x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="${fMonth}" font-weight="${weight}" fill="${fcolor}">${label}</text>`;
    }

    // Legend: one entry per displayed year — opt-in, redundant with the
    // summary line above the chart.
    let legend = '';
    if (this._config.showLegend && px >= 280) {
      const ly = pad.top - 6;
      const lx = pad.left + plotW;
      const entryW = N >= 4 ? 44 : 55;
      years.forEach((yr, idx) => {
        const isCurrentSeries = idx === lastIndex;
        const swColor = isCurrentSeries ? this._config.color : this._seriesColor(idx, N);
        const offsetFromRight = (N - idx) * entryW;
        const sx = lx - offsetFromRight;
        legend += `
          <rect x="${sx.toFixed(1)}" y="${(ly - 8).toFixed(1)}" width="10" height="10" fill="${swColor}" rx="2"/>
          <text x="${(sx + 13).toFixed(1)}" y="${(ly + 1).toFixed(1)}" font-size="9" fill="var(--secondary-text-color)">${yr}</text>
        `;
      });
    }

    const unitLabel = `<text x="${(pad.left - 4).toFixed(1)}" y="${(pad.top - 10).toFixed(1)}" text-anchor="middle" font-size="${fAxis}" fill="var(--secondary-text-color)">${this._preset.unit}</text>`;

    // Right axis — shared by the installed-capacity line and the peak-power
    // ticks. Unit label follows kWp when a capacity is configured (that's
    // the more specific/meaningful label for this preset); falls back to kW
    // when only peak-power markers are shown without a capacity line.
    let kwpLine = '';
    const rightUnit = hasTemperature ? '°C'
      : (kwp != null ? t(this._hass, 'unitKwp') : (hasDistance ? 'km' : 'kW'));
    const unitLabelRight = showRightAxis
      ? `<text x="${(pad.left + plotW + 4).toFixed(1)}" y="${(pad.top - 10).toFixed(1)}" text-anchor="start" font-size="${fAxis}" fill="var(--secondary-text-color)">${rightUnit}</text>`
      : '';
    const axesRight = showRightAxis
      ? `<line x1="${(pad.left + plotW).toFixed(1)}" y1="${pad.top}" x2="${(pad.left + plotW).toFixed(1)}" y2="${(pad.top + plotH).toFixed(1)}" stroke="var(--secondary-text-color)" stroke-width="1"/>`
      : '';
    if (kwp != null) {
      const yKwp = yForRight(Math.min(kwp, rightMax));
      // No unit suffix here — the axis unit label above already says "kWp",
      // repeating it on every line/value would just be noise.
      kwpLine = `
        <line x1="${pad.left}" y1="${yKwp.toFixed(1)}" x2="${(pad.left + plotW).toFixed(1)}" y2="${yKwp.toFixed(1)}" stroke="${colorText}" stroke-width="1" stroke-dasharray="5 3" opacity="0.85"/>
        <text x="${(pad.left + plotW + 6).toFixed(1)}" y="${(yKwp - 4).toFixed(1)}" text-anchor="start" font-size="${fAxis}" fill="${colorText}">${kwp}</text>
      `;
    }

    // Outdoor-temperature line — current year only (comparing several years'
    // temperature lines against several years' bars gets visually busy fast;
    // the summary line already exists for cross-year comparison elsewhere).
    let tempLine = '';
    if (tempMode === 'daily') {
      const points = (this._temperatureDaily || [])
        .filter(p => p.month <= currentMonth)
        .map(p => {
          const daysInMonth = new Date(years[lastIndex], p.month + 1, 0).getDate();
          const cx = pad.left + p.month * slotW + ((p.day - 0.5) / daysInMonth) * slotW;
          return { x: cx, y: yForRight(p.value), v: p.value, month: p.month, day: p.day };
        })
        .sort((a, b) => a.x - b.x);
      if (points.length) {
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        tempLine += `<path d="${pathD}" fill="none" stroke="${this._config.colorTemp}" stroke-width="1.5"/>`;
        // Hover target: one invisible strip per day is too many DOM nodes for
        // a year of data, so a single tooltip source covering the whole path
        // isn't practical either — instead, sample every ~3rd point for a
        // hoverable dot; the line itself already conveys the daily detail.
        points.filter((_, i) => i % 3 === 0 || i === points.length - 1).forEach(p => {
          const monthLabel = monthStyle === 'initial' ? MONTHS_INITIAL_L[p.month] : MONTHS_ABBR_L[p.month];
          const tip = EnergyChartsByLutarym.escAttr(`${p.day}. ${monthLabel} ${years[lastIndex]}: ${p.v.toFixed(1)}°C`);
          tempLine += `<circle class="lut-tt" data-tooltip="${tip}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="transparent"/>`;
        });
      }
    } else if (tempMode === 'minmax' || tempMode === 'mean') {
      const monthly = monthlyTempFor(lastIndex);
      const points = [];
      for (let m = 0; m <= currentMonth; m++) {
        const entry = monthly[m];
        if (!entry || entry.mean == null) continue;
        const cx = pad.left + m * slotW + slotW / 2;
        points.push({ x: cx, y: yForRight(entry.mean), entry, m });
      }
      if (tempMode === 'minmax') {
        points.forEach(p => {
          if (p.entry.min == null || p.entry.max == null) return;
          const yMin = yForRight(p.entry.min);
          const yMax = yForRight(p.entry.max);
          tempLine += `<line x1="${p.x.toFixed(1)}" y1="${yMin.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="${this._config.colorTemp}" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`;
        });
      }
      if (points.length) {
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        tempLine += `<path d="${pathD}" fill="none" stroke="${this._config.colorTemp}" stroke-width="2"/>`;
        points.forEach(p => {
          const monthLabel = monthStyle === 'initial' ? MONTHS_INITIAL_L[p.m] : MONTHS_ABBR_L[p.m];
          const tipText = tempMode === 'minmax' && p.entry.min != null && p.entry.max != null
            ? `${monthLabel} ${years[lastIndex]}: Ø ${p.entry.mean.toFixed(1)}°C (${p.entry.min.toFixed(1)}–${p.entry.max.toFixed(1)}°C)`
            : `${monthLabel} ${years[lastIndex]}: ${p.entry.mean.toFixed(1)}°C`;
          const tip = EnergyChartsByLutarym.escAttr(tipText);
          // Invisible larger hit circle + small visible dot, same pattern as elsewhere.
          tempLine += `<circle class="lut-tt" data-tooltip="${tip}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8" fill="transparent"/>`;
          tempLine += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${this._config.colorTemp}"/>`;
        });
      }
    }

    // Distance-driven line — current year only, same reasoning as the other
    // second-entity overlays. Monthly sum (not mean/min/max — a car's
    // distance driven doesn't have a meaningful "range" within the month the
    // way temperature does, it's just a running total).
    let distanceLine = '';
    if (hasDistance) {
      const dSeries = this._distanceData[lastIndex] || [];
      const points = [];
      for (let m = 0; m <= currentMonth; m++) {
        const v = dSeries[m];
        if (v == null) continue;
        const cx = pad.left + m * slotW + slotW / 2;
        points.push({ x: cx, y: yForRight(Math.max(v, 0)), v, m });
      }
      if (points.length) {
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        distanceLine += `<path d="${pathD}" fill="none" stroke="${this._config.colorDistance}" stroke-width="2"/>`;
        points.forEach(p => {
          const monthLabel = monthStyle === 'initial' ? MONTHS_INITIAL_L[p.m] : MONTHS_ABBR_L[p.m];
          const tip = EnergyChartsByLutarym.escAttr(`${monthLabel} ${years[lastIndex]}: ${p.v.toFixed(0)} km`);
          distanceLine += `<circle class="lut-tt" data-tooltip="${tip}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8" fill="transparent"/>`;
          distanceLine += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${this._config.colorDistance}"/>`;
        });
      }
    }


    const axes = `
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" stroke="var(--secondary-text-color)" stroke-width="1"/>
      <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="var(--secondary-text-color)" stroke-width="1"/>
      ${axesRight}
    `;

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;display:block;">
      ${grid}${bars}${kwpLine}${tempLine}${distanceLine}${valLabels}${xLabels}${yLabels}${yLabelsRight}${unitLabel}${unitLabelRight}${axes}${legend}
    </svg>`;
  }

  // ── Appearance mode (auto follows dashboard theme via HA CSS vars;
  //    light/dark force local overrides only for this card instance) ──

  _appearanceCSSVars() {
    const mode = this._config.appearance || 'auto';
    if (mode === 'light') {
      return `
        --primary-text-color: #1c1c1c;
        --secondary-text-color: #6b7280;
        --divider-color: #e0e0e0;
        --card-background-color: #ffffff;
      `;
    }
    if (mode === 'dark') {
      return `
        --primary-text-color: #e5e7eb;
        --secondary-text-color: #9ca3af;
        --divider-color: #3f3f46;
        --card-background-color: #1e1e1e;
      `;
    }
    return ''; // auto: nothing overridden, HA theme variables apply as usual
  }

  // ── Summary (average or sum depending on the preset) ─────────────────

  _summary(arr, yearIdx) {
    const vals = arr.filter(v => v !== null);
    if (!vals.length) return null;
    // Verhaeltnis-Presets (Eigenverbrauch, Ladeeffizienz, COP): der
    // Jahreswert ist die Quote der Jahressummen, nicht der Durchschnitt der
    // Monatsquoten. Ein Februar mit 20 kWh PV darf den Jahreswert nicht so
    // stark bewegen wie ein Juni mit 900 kWh.
    if (this._preset?.isRatio && yearIdx != null) {
      const tot = this._ratioTotals?.[yearIdx];
      if (tot && tot.den > 0) {
        const q = tot.num / tot.den;
        return this._preset.valueSuffix === '%' ? q * 100 : q;
      }
    }
    if (this._isRangeMode()) {
      const means = vals.map(v => v.mean).filter(v => v != null);
      const mins  = vals.map(v => v.min).filter(v => v != null);
      const maxs  = vals.map(v => v.max).filter(v => v != null);
      return {
        mean: means.length ? means.reduce((a, b) => a + b, 0) / means.length : null,
        min:  mins.length ? Math.min(...mins) : null,
        max:  maxs.length ? Math.max(...maxs) : null,
      };
    }
    if (this._preset.aggregate === 'avg') {
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return vals.reduce((a, b) => a + b, 0);
  }

  _formatSummary(val) {
    if (val === null) return '–';
    const unit = this._preset.unit;
    if (this._isRangeMode()) {
      const suffix = this._preset.valueSuffix;
      const meanStr = val.mean != null ? val.mean.toFixed(0) : '–';
      if (val.min != null && val.max != null) {
        return `Ø ${meanStr}${suffix} (${val.min.toFixed(0)}–${val.max.toFixed(0)}${suffix})`;
      }
      return `Ø ${meanStr}${suffix}`;
    }
    if (this._preset.aggregate === 'avg') {
      return `Ø ${val.toFixed(this._preset.decimals ?? 1)} ${unit}`;
    }
    return `${val.toFixed(this._preset.decimals ?? 0)} ${unit}`;
  }

  // Single-value formatter shared by the hover tooltip — same style as the
  // in-chart bar labels and the summary line (suffix directly attached for
  // %, space-separated unit for kWh etc.).
  _formatValue(v) {
    if (v == null) return '–';
    const suffix = this._preset.valueSuffix;
    const d = this._preset.decimals ?? 0;
    return suffix ? `${v.toFixed(d)}${suffix}` : `${v.toFixed(d)} ${this._preset.unit}`;
  }

  // Hover-tooltip text for one bar: month + year + value, or month + year +
  // Ø(min–max) in range mode.
  _tooltipText(monthLabel, year, val) {
    if (this._isRangeMode() && val && typeof val === 'object') {
      const meanStr = val.mean != null ? this._formatValue(val.mean) : '–';
      if (val.min != null && val.max != null) {
        const suffix = this._preset.valueSuffix;
        return `${monthLabel} ${year}: Ø ${meanStr} (${val.min.toFixed(0)}–${val.max.toFixed(0)}${suffix})`;
      }
      return `${monthLabel} ${year}: Ø ${meanStr}`;
    }
    return `${monthLabel} ${year}: ${this._formatValue(val)}`;
  }

  // Minimal escaping for text placed inside an HTML attribute.
  static escAttr(s) {
    return lutarymEsc(s);
  }

  // ── Render ────────────────────────────────────────────────────────────

  _render() {
    if (!this._config) return;
    if (this._isOverview) return this._renderOverview();
    if (this._isRooms) return this._renderRooms();
    const hass = this._hass;

    const now          = new Date();
    const currentMonth = now.getMonth();
    const years        = this._seriesYears;
    const lastIndex    = years.length - 1;
    const px           = this._width || 0;

    const ratioMissingNumerator = this._preset?.isRatio && !this._config.gridEntity;
    let body;
    if (!this._config.entity) {
      body = `<div class="loading">${t(hass, 'notConfigured')}</div>`;
    } else if (ratioMissingNumerator) {
      const secondLabelKey = { grid_entity: 'editorGridEntity', feedin_entity: 'editorFeedinEntity', heat_entity: 'editorHeatEntity' }[this._preset.secondKey];
      const fieldName = secondLabelKey ? t(hass, secondLabelKey) : t(hass, 'editorEntity');
      body = `<div class="loading">${t(hass, 'notConfiguredRatio', { field: fieldName })}</div>`;
    } else if (this._loading) {
      body = `<div class="loading">${t(hass, 'loading')}</div>`;
    } else if (this._error) {
      body = `<div class="error">${lutarymEsc(t(hass, 'error', { msg: this._error }))}</div>`;
    } else {
      const showTotal = px === 0 || px >= 280;
      const totalsItems = years.map((yr, idx) => {
        const isCurrentSeries = idx === lastIndex;
        const dotColor = isCurrentSeries ? this._config.color : this._seriesColor(idx, years.length);
        const sum = this._summary(this._seriesData[idx] || [], idx);
        return `<span class="tot-item"><span class="dot" style="background:${dotColor}"></span>${yr}: <strong>${this._formatSummary(sum)}</strong></span>`;
      }).join('');
      body = `
        ${showTotal ? `<div class="totals">${totalsItems}</div>` : ''}
        <div class="chart-wrap">${this._buildChart(currentMonth)}</div>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          min-width: 0;
          box-sizing: border-box;
          ${this._appearanceCSSVars()}
        }
        ha-card {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          min-width: 0;
        }
        .card-header {
          padding: 14px 14px 2px;
          font-size: ${this._config.titleFontSize}px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--primary-text-color);
          flex-shrink: 0;
          min-width: 0;
        }
        .totals {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 16px;
          padding: 6px 14px 8px;
          font-size: 12px;
          color: var(--secondary-text-color);
          flex-shrink: 0;
          min-width: 0;
        }
        .tot-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
        .dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
        .chart-wrap {
          padding: 0 6px 10px;
          flex: 1 1 auto;
          min-height: 0;
          min-width: 0;
        }
        .loading {
          padding: 28px 14px;
          text-align: center;
          color: var(--secondary-text-color);
          font-size: 13px;
        }
        .error {
          padding: 14px;
          color: var(--error-color, red);
          font-size: 12px;
        }
        .chart-wrap svg .lut-tt {
          cursor: pointer;
        }
        .chart-wrap svg rect.lut-tt[fill]:not([fill="transparent"]):hover {
          filter: brightness(1.15);
        }
        .lut-tooltip {
          position: fixed;
          left: 0;
          top: 0;
          pointer-events: none;
          z-index: 9999;
          background: var(--card-background-color, #1c1c1c);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color, #444);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          transform: translate(-50%, calc(-100% - 10px));
          transition: opacity 0.1s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .lut-tooltip.visible {
          opacity: 1;
        }
      </style>
      <ha-card>
        <div class="card-header">${lutarymEsc(this._config.title)}</div>
        ${body}
        <div class="lut-tooltip" id="lutTooltip"></div>
      </ha-card>
    `;

    this.shadowRoot.querySelector('ha-card').addEventListener('dblclick', () => {
      this._lastFetch = 0;
      if (this._hass && this._config.entity) this._fetchData();
    });

    this._attachTooltipHandlers();
  }

  // Hover tooltips for bars/markers — attached fresh after every render
  // since the SVG is fully rebuilt each time (same pattern as the dblclick
  // handler above).
  _attachTooltipHandlers() {
    const tooltip = this.shadowRoot.getElementById('lutTooltip');
    if (!tooltip) return;
    this.shadowRoot.querySelectorAll('.lut-tt').forEach(el => {
      el.addEventListener('pointerenter', () => {
        tooltip.textContent = el.getAttribute('data-tooltip') || '';
        tooltip.classList.add('visible');
      });
      el.addEventListener('pointermove', ev => {
        tooltip.style.left = `${ev.clientX}px`;
        tooltip.style.top = `${ev.clientY}px`;
      });
      el.addEventListener('pointerleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  // Dynamic height estimation instead of a fixed value — otherwise the
  // area reserved by Home Assistant in Masonry/Sections dashboards
  // wouldn't match the actually rendered height (which depends on card
  // width, title, and label font size), causing overlaps or gaps.
  _estimatedPixelHeight() {
    // overview und rooms rendern gar kein Diagramm. Mit der Balkenformel
    // reservierte Home Assistant fuer sie eine Hoehe, die mit der
    // tatsaechlichen nichts zu tun hat - im Masonry-Dashboard fuehrte das
    // zu Ueberlappungen oder grossen Luecken.
    if (this._isOverview) {
      // Titel + Hero + Zeile "Energie" (+ ggf. Grundgebuehr) + Trenner +
      // Verbrauchsblock + Vergleich (+ ggf. Hinweiszeile).
      const cfg = this._config || {};
      const hasFee = (cfg.base_fee_yearly != null && cfg.base_fee_yearly !== '')
                  || (cfg.base_fee_monthly != null && cfg.base_fee_monthly !== '');
      const note = this._overviewData?.partialYear ? 20 : 0;
      return 32 + (cfg.titleFontSize || 14) * 1.3 + 14
           + 58 + 18 + 14 + (hasFee ? 2 * 24 : 24)
           + 29 + 62 + 24 + note;
    }
    if (this._isRooms) {
      const cfg = this._config || {};
      const n = this._effectiveRooms().length;
      const cols = this._roomColumns();
      // Mehrspaltig sind es weniger Zeilen, dafuer ist jede hoeher, weil
      // der Balken unter Namen und Werten sitzt.
      const nRows = Math.ceil(n / cols) + (cfg.total_entity && n ? 1 : 0);
      const rowH = cols > 1 ? 46 : 32;
      const hasSplit = !!(cfg.total_entity && cfg.pvEntity && cfg.feedinEntity);
      // Gesamtbalken unten: Trenner, Streifen und die Legende, deren
      // Zeilenzahl von der Kartenbreite abhaengt.
      const perLegRow = Math.max(1, Math.floor((this._width || 400) / 110));
      const share = n ? (28 + 12 + 10 + Math.ceil((n + 1) / perLegRow) * 18) : 0;
      return 32 + (cfg.titleFontSize || 14) * 1.3 + 14
           + (hasSplit ? 66 : 60) + 29 + nRows * rowH + share;
    }
    const px = this._width || 400;
    const lp = this._layoutParams(px);
    return this._nonChartOverhead(px) + lp.H;
  }

  getCardSize() {
    return Math.max(1, Math.ceil(this._estimatedPixelHeight() / 50));
  }

  // Sections-Dashboard: Hoehe in Rasterzeilen (1 Zeile entspricht 56px).
  //
  // overview und rooms wachsen mit ihrem Inhalt - bei rooms haengt die
  // Zeilenzahl an der Zahl der Raeume, die bei automatischer Erkennung
  // erst nach dem Laden der Bereiche feststeht. Eine feste Zahl waere
  // dann immer die von vorhin, deshalb 'auto': Home Assistant misst die
  // tatsaechlich gerenderte Hoehe selbst. Das Balkendiagramm dagegen
  // fuellt die vorgegebene Hoehe aus und bekommt weiter eine Zahl.
  getGridOptions() {
    if (this._isOverview || this._isRooms) {
      return { columns: 12, rows: 'auto', min_rows: 3 };
    }
    const rows = Math.max(3, Math.ceil(this._estimatedPixelHeight() / 56));
    return { columns: 12, rows, min_rows: 3 };
  }

  // Aeltere Home-Assistant-Versionen fragen diese Variante ab. Sie nutzt
  // eigene Schluesselnamen, ein Durchreichen von getGridOptions wuerde
  // dort nicht erkannt.
  getLayoutOptions() {
    if (this._isOverview || this._isRooms) {
      return { grid_columns: 12, grid_rows: 'auto', grid_min_rows: 3 };
    }
    const rows = Math.max(3, Math.ceil(this._estimatedPixelHeight() / 56));
    return { grid_columns: 12, grid_rows: rows, grid_min_rows: 3 };
  }
}

customElements.define('energy-charts-by-lutarym', EnergyChartsByLutarym);

// ── Visual config editor ────────────────────────────────────────────────
// Uses native HA form elements (<ha-selector>) so the input form looks
// exactly like built-in Home Assistant cards: a dropdown for the card
// type, a searchable entity picker, and text/color fields. NOTHING needs
// to be entered via YAML — everything runs through this GUI.

class EnergyChartsByLutarymEditor extends HTMLElement {
  setConfig(config) {
    // IMPORTANT: Home Assistant calls setConfig again even when WE
    // ourselves just fired config-changed (e.g. on every keystroke in a
    // text field). If we rebuilt the entire form every time (_render with
    // innerHTML), the currently focused input field would lose
    // focus/cursor on every keystroke. So only re-render on the very
    // first call, or when the card type changed externally (e.g. via
    // undo or manual YAML editing).
    const firstLoad    = !this._config;
    const typeChanged   = !firstLoad && config.card_type !== this._config.card_type;

    this._config = { ...config };
    if (Array.isArray(config.rooms)) this._config.rooms = config.rooms.map(r => ({ ...r }));

    if (firstLoad || typeChanged) {
      this._render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    // entity pickers etc. need hass for autocomplete/display
    this.querySelectorAll('ha-selector').forEach(sel => { sel.hass = hass; });
  }

  get _cardType() {
    return CARD_TYPE_KEYS.includes(this._config?.card_type) ? this._config.card_type : 'energy';
  }

  _fireChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _onTypeChange(value) {
    // Only reset the preset overrides so the new type's presets apply.
    // The outer "type" field (custom:energy-charts-by-lutarym) and any other
    // keys managed by Home Assistant (e.g. grid_options) MUST be
    // preserved — otherwise HA no longer recognizes the card and falls
    // back to the raw YAML editor.
    const preserved = { ...this._config };
    delete preserved.entity;
    delete preserved.title;
    delete preserved.color;
    delete preserved.color_prev;
    delete preserved.stat_mode;
    delete preserved.kwp;
    delete preserved.power_entity;
    delete preserved.temperature_entity;
    delete preserved.temp_mode;
    delete preserved.distance_entity;
    delete preserved.color_distance;
    delete preserved.grid_entity;
    delete preserved.feedin_entity;
    delete preserved.heat_entity;
    delete preserved.heat_entity2;
    delete preserved.color_temp;
    delete preserved.total_entity;
    delete preserved.pv_entity;
    delete preserved.rooms;
    delete preserved.rooms_auto;
    delete preserved.rooms_auto_include;
    delete preserved.rooms_auto_exclude;
    delete preserved.rooms_columns;
    delete preserved.energy_entity;
    delete preserved.price_per_kwh;
    delete preserved.base_fee_yearly;
    delete preserved.base_fee_monthly;
    delete preserved.base_fee_mode;
    delete preserved.previous_year_kwh;
    preserved.card_type = value;

    this._config = preserved;
    this._render();
    this._fireChanged();
  }

  _onFieldChange(field, value) {
    if (value === '' || value == null) {
      delete this._config[field];
    } else {
      this._config[field] = value;
    }
    this._fireChanged();
  }

  // ── Rooms editor helpers ──
  _rmEnsure() { if (!Array.isArray(this._config.rooms)) this._config.rooms = []; }
  // Rebuild config with fresh array + object references before emitting, so
  // Home Assistant reliably detects the change (an in-place mutation of the
  // same array reference can be ignored by HA's change detection).
  _rmClone() { this._config = { ...this._config, rooms: (this._config.rooms || []).map(r => ({ ...r })) }; }
  _rmTotalChange(v) { if (v) this._config.total_entity = v; else delete this._config.total_entity; this._rmClone(); this._fireChanged(); }
  _rmRoomChange(i, field, v) { this._rmEnsure(); this._config.rooms[i][field] = v; this._rmClone(); this._fireChanged(); }
  _rmAddRoom() { this._rmEnsure(); if (this._config.rooms.length >= 10) return; this._config.rooms.push({ name: '', entity: '' }); this._rmClone(); this._render(); this._fireChanged(); }
  _rmRemoveRoom(i) { this._rmEnsure(); this._config.rooms.splice(i, 1); this._rmClone(); this._render(); this._fireChanged(); }

  _renderRoomsEditor(form, hass) {
    this._rmEnsure();
    const cfg = this._config;

    // Total entity
    form.appendChild(this._row(
      t(hass, 'rmEditorTotalEntity'), t(hass, 'rmEditorTotalHint'), { entity: {} },
      'total_entity', cfg.total_entity,
    ));
    form.appendChild(this._row(
      t(hass, 'rmEditorPvEntity'), t(hass, 'rmEditorPvHint'), { entity: {} },
      'pv_entity', cfg.pv_entity,
    ));
    form.appendChild(this._row(
      t(hass, 'rmEditorFeedinEntity'), null, { entity: {} },
      'feedin_entity', cfg.feedin_entity,
    ));
    // Title
    form.appendChild(this._row(
      t(hass, 'editorTitle'), null, { text: {} }, 'title', cfg.title,
    ));

    // Spaltenzahl: betrifft die Darstellung, deshalb vor der Frage,
    // woher die Raeume kommen.
    form.appendChild(this._row(
      t(hass, 'rmColumnsLabel'), t(hass, 'rmColumnsHint'),
      { select: { mode: 'dropdown', options: [
        { value: '1', label: t(hass, 'rmColumns1') },
        { value: '2', label: t(hass, 'rmColumns2') },
        { value: '3', label: t(hass, 'rmColumns3') },
      ] } },
      'rooms_columns', String(cfg.rooms_columns ?? 1),
    ));

    // ── Automatische Erkennung ──
    const auto = cfg.rooms_auto === true;
    form.appendChild(this._toggleRow(
      t(hass, 'rmAutoLabel'), t(hass, 'rmAutoHint'), 'rooms_auto', auto, true,
    ));

    if (auto) {
      form.appendChild(this._row(
        t(hass, 'rmAutoIncludeLabel'), t(hass, 'rmAutoIncludeHint'), { text: {} },
        'rooms_auto_include', cfg.rooms_auto_include,
      ));
      form.appendChild(this._row(
        t(hass, 'rmAutoExcludeLabel'), t(hass, 'rmAutoExcludeHint'), { text: {} },
        'rooms_auto_exclude', cfg.rooms_auto_exclude,
      ));

      // Bereichsregistry einmal nachladen und danach neu zeichnen. Ohne
      // sie kann die Vorschau nicht gruppieren.
      if (this._hass && !this._areaOf && !this._areaFailed && !this._areaLoading) {
        this._areaLoading = true;
        lutarymLoadAreas(this._hass).then(m => {
          this._areaOf = m;
        }).catch(() => {
          this._areaFailed = true;
        }).finally(() => {
          this._areaLoading = false;
          this._render();
        });
      }

      // Trefferliste direkt im Editor: ohne sie filtert man blind.
      const found = this._hass ? lutarymDetectRooms(this._hass, {
        include: cfg.rooms_auto_include || '',
        exclude: [cfg.rooms_auto_exclude, cfg.total_entity, cfg.pv_entity, cfg.feedin_entity]
          .filter(Boolean).join(','),
        areaOf: this._areaOf,
        flatFallback: this._areaFailed === true,
      }) : [];
      const box = document.createElement('div');
      box.className = 'editor-row';
      box.style.cssText = 'border:1px solid var(--divider-color,#e0e0e0);border-radius:8px;padding:10px;gap:6px;';
      const head = document.createElement('div');
      head.style.cssText = 'font-size:12px;font-weight:600;color:var(--secondary-text-color);';
      head.textContent = this._areaLoading ? t(hass, 'loading')
        : (found.length ? t(hass, 'rmAutoFound', { count: found.length })
                        : t(hass, 'rmAutoNone'));
      box.appendChild(head);
      found.forEach(r => {
        const line = document.createElement('div');
        line.style.cssText = 'display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:2px 0;';
        const nm = document.createElement('span');
        nm.textContent = r.name;
        nm.style.cssText = 'color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const id = document.createElement('span');
        id.textContent = t(hass, 'rmAutoMeters', { count: r.entities.length })
          + (r.power_entities.length ? ' + W' : '');
        id.style.cssText = 'color:var(--secondary-text-color);font-size:11px;white-space:nowrap;';
        line.appendChild(nm); line.appendChild(id);
        box.appendChild(line);
      });
      form.appendChild(box);

      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = this._areaFailed
        ? t(hass, 'rmAutoNoAreas') + ' ' + t(hass, 'rmAutoListHidden')
        : t(hass, 'rmAutoListHidden');
      form.appendChild(note);
      return; // manuelle Liste und "Raum hinzufuegen" entfallen
    }

    // Section label + hint
    const sec = document.createElement('div');
    sec.className = 'editor-row';
    sec.innerHTML = `<label>${t(hass, 'rmRoomsSectionLabel', { count: cfg.rooms.length })}</label><div class="hint">${t(hass, 'rmRoomsHint')}</div>`;
    form.appendChild(sec);

    cfg.rooms.forEach((room, i) => {
      const box = document.createElement('div');
      box.className = 'editor-row';
      box.style.border = '1px solid var(--divider-color, #e0e0e0)';
      box.style.borderRadius = '8px';
      box.style.padding = '10px';
      box.style.gap = '8px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      const hl = document.createElement('span');
      hl.textContent = t(hass, 'rmRoomHeaderLabel', { n: i + 1 });
      hl.style.fontSize = '12px';
      hl.style.color = 'var(--secondary-text-color)';
      hl.style.fontWeight = '600';
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = t(hass, 'rmRemoveLabel');
      rm.style.cssText = 'font-size:11px;color:var(--error-color,#c62828);background:none;border:none;cursor:pointer;padding:2px 6px;';
      rm.addEventListener('click', () => this._rmRemoveRoom(i));
      header.appendChild(hl); header.appendChild(rm);
      box.appendChild(header);

      // name (text input)
      const nameWrap = document.createElement('div'); nameWrap.className = 'editor-row';
      const nameLbl = document.createElement('label'); nameLbl.textContent = t(hass, 'rmNameLabel'); nameWrap.appendChild(nameLbl);
      const nameInp = document.createElement('input');
      nameInp.type = 'text'; nameInp.className = 'number-input'; nameInp.style.width = '100%';
      nameInp.value = room.name ?? ''; nameInp.placeholder = t(hass, 'rmNamePlaceholder');
      nameInp.addEventListener('change', ev => this._rmRoomChange(i, 'name', ev.target.value));
      nameWrap.appendChild(nameInp); box.appendChild(nameWrap);

      // entity
      const entWrap = document.createElement('div'); entWrap.className = 'editor-row';
      const entLbl = document.createElement('label'); entLbl.textContent = t(hass, 'rmEntityLabel'); entWrap.appendChild(entLbl);
      const entSel = document.createElement('ha-selector');
      entSel.hass = this._hass; entSel.selector = { entity: {} }; entSel.value = room.entity ?? '';
      entSel.addEventListener('value-changed', ev => { ev.stopPropagation(); this._rmRoomChange(i, 'entity', ev.detail.value); });
      entWrap.appendChild(entSel); box.appendChild(entWrap);

      // power (optional)
      const pWrap = document.createElement('div'); pWrap.className = 'editor-row';
      const pLbl = document.createElement('label'); pLbl.textContent = t(hass, 'rmPowerEntityLabel'); pWrap.appendChild(pLbl);
      const pSel = document.createElement('ha-selector');
      pSel.hass = this._hass; pSel.selector = { entity: {} }; pSel.value = room.power_entity ?? '';
      pSel.addEventListener('value-changed', ev => { ev.stopPropagation(); this._rmRoomChange(i, 'power_entity', ev.detail.value); });
      pWrap.appendChild(pSel); box.appendChild(pWrap);

      form.appendChild(box);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = t(hass, 'rmAddRoomLabel');
    add.disabled = cfg.rooms.length >= 10;
    add.style.cssText = 'padding:8px 12px;border:1px dashed var(--divider-color,#ccc);border-radius:6px;background:none;color:var(--primary-color,#03a9f4);font-size:13px;cursor:pointer;';
    add.addEventListener('click', () => this._rmAddRoom());
    form.appendChild(add);
  }

  _row(labelText, hintText, selectorObj, field, value) {
    const wrap = document.createElement('div');
    wrap.className = 'editor-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);

    let control;
    if (selectorObj.select) {
      // Native <select> instead of <ha-selector> for dropdowns: ha-selector
      // is loaded asynchronously by Home Assistant — if the editor is
      // created very early (before the component is registered), clicks
      // and values are occasionally lost ("dropdown behaves incorrectly").
      // Native <select> always works reliably, regardless of load timing.
      control = document.createElement('select');
      control.className = 'native-select';
      (selectorObj.select.options || []).forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        if (String(opt.value) === String(value)) optionEl.selected = true;
        control.appendChild(optionEl);
      });
      control.addEventListener('change', ev => {
        const newVal = ev.target.value;
        if (field === 'card_type') {
          this._onTypeChange(newVal);
        } else {
          this._onFieldChange(field, newVal);
        }
      });
    } else {
      control = document.createElement('ha-selector');
      control.hass = this._hass;
      control.selector = selectorObj;
      control.value = value ?? '';
      control.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        const newVal = ev.detail.value;
        this._onFieldChange(field, newVal);
      });
    }
    wrap.appendChild(control);

    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  // Compact native color field (<input type="color">) instead of the very
  // wide ha-selector color picker. effectiveValue is the actually
  // effective value (override, if set, otherwise the preset default) —
  // so the field shows the actual default instead of always black. A
  // "Reset" button removes a set override so the automatic default
  // applies again.
  _colorRow(labelText, hintText, field, effectiveValue, isOverridden) {
    const wrap = document.createElement('div');
    wrap.className = 'editor-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);

    const controls = document.createElement('div');
    controls.className = 'color-controls';

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'color-input';
    input.value = effectiveValue;
    input.addEventListener('input', ev => {
      this._onFieldChange(field, ev.target.value);
      resetBtn.style.visibility = 'visible';
    });
    controls.appendChild(input);

    const hexLabel = document.createElement('span');
    hexLabel.className = 'color-hex';
    hexLabel.textContent = effectiveValue;
    input.addEventListener('input', ev => { hexLabel.textContent = ev.target.value; });
    controls.appendChild(hexLabel);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'color-reset';
    resetBtn.textContent = t(this._hass, 'resetLabel');
    resetBtn.style.visibility = isOverridden ? 'visible' : 'hidden';
    resetBtn.addEventListener('click', () => {
      this._onFieldChange(field, null);
      this._render();
    });
    controls.appendChild(resetBtn);

    wrap.appendChild(controls);

    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  // Compact number field for font sizes (px). isAutoAllowed=true shows an
  // "Automatic" button that clears the field. placeholderText is shown
  // when the field is empty — makes it visible which default font size
  // applies, instead of the field just looking empty.
  _numberRow(labelText, hintText, field, value, min, max, isAutoAllowed, placeholderText, step = 1, unitText = 'px') {
    const wrap = document.createElement('div');
    wrap.className = 'editor-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);

    const controls = document.createElement('div');
    controls.className = 'color-controls';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'number-input';
    input.min = min;
    input.max = max;
    input.step = step;
    if (placeholderText != null) input.placeholder = placeholderText;
    if (value != null) input.value = value;
    input.addEventListener('input', ev => {
      const v = ev.target.value === '' ? null : Number(ev.target.value);
      this._onFieldChange(field, v);
      if (isAutoAllowed) autoBtn.style.visibility = v == null ? 'hidden' : 'visible';
    });
    controls.appendChild(input);

    const unit = document.createElement('span');
    unit.className = 'color-hex';
    unit.textContent = unitText;
    controls.appendChild(unit);

    let autoBtn;
    if (isAutoAllowed) {
      autoBtn = document.createElement('button');
      autoBtn.type = 'button';
      autoBtn.className = 'color-reset';
      autoBtn.textContent = t(this._hass, 'autoLabel');
      autoBtn.style.visibility = value != null ? 'visible' : 'hidden';
      autoBtn.addEventListener('click', () => {
        this._onFieldChange(field, null);
        this._render();
      });
      controls.appendChild(autoBtn);
    }

    wrap.appendChild(controls);

    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  // Simple boolean toggle (native checkbox — same reasoning as the native
  // <select> for dropdowns: no dependency on ha-selector loading timing).
  _toggleRow(labelText, hintText, field, checked, rerender) {
    const wrap = document.createElement('div');
    wrap.className = 'editor-row';

    const line = document.createElement('div');
    line.className = 'toggle-line';

    const label = document.createElement('label');
    label.textContent = labelText;
    line.appendChild(label);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'toggle-input';
    input.checked = checked;
    input.addEventListener('change', ev => {
      this._onFieldChange(field, ev.target.checked);
      // Schalter, die andere Felder ein- oder ausblenden, brauchen einen
      // Neuaufbau: setConfig rendert nur beim ersten Aufruf und beim
      // Kartentyp-Wechsel neu, damit Textfelder den Fokus behalten.
      if (rerender) this._render();
    });
    line.appendChild(input);

    wrap.appendChild(line);

    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  // Arrange two form rows side by side instead of stacked
  _sideBySide(...rows) {
    const wrap = document.createElement('div');
    wrap.className = 'row-pair';
    rows.forEach(row => wrap.appendChild(row));
    return wrap;
  }

  _render() {
    if (!this._config) return;
    const hass = this._hass;
    const preset = PRESETS[this._cardType];
    const info = presetInfo(hass, this._cardType);

    this.innerHTML = `
      <style>
        .editor-form { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
        .editor-row { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 13px; font-weight: 500; color: var(--primary-text-color); }
        .hint { font-size: 11px; color: var(--secondary-text-color); }
        .color-controls { display: flex; align-items: center; gap: 8px; }
        .color-input {
          width: 40px;
          height: 30px;
          padding: 2px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          cursor: pointer;
          background: none;
          flex-shrink: 0;
        }
        .color-hex {
          font-size: 12px;
          font-family: monospace;
          color: var(--secondary-text-color);
        }
        .color-reset {
          margin-left: auto;
          font-size: 11px;
          color: var(--primary-color, #03a9f4);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
        }
        .color-reset:hover { text-decoration: underline; }
        .number-input {
          width: 64px;
          padding: 6px 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        .native-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
          box-sizing: border-box;
          cursor: pointer;
        }
        .row-pair {
          display: flex;
          gap: 16px;
        }
        .row-pair > .editor-row {
          flex: 1;
          min-width: 0;
        }
        .toggle-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .toggle-input {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          cursor: pointer;
          accent-color: var(--primary-color, #03a9f4);
        }
        .section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--secondary-text-color);
          border-top: 1px solid var(--divider-color, #e0e0e0);
          padding-top: 12px;
          margin-top: 4px;
        }
      </style>
      <div class="editor-form"></div>
    `;

    const form = this.querySelector('.editor-form');

    form.appendChild(this._row(
      t(hass, 'editorCardType'),
      null,
      { select: { mode: 'dropdown', options: CARD_TYPE_KEYS.map(k => ({ value: k, label: presetInfo(hass, k).label })) } },
      'card_type',
      this._cardType,
    ));

    // Overview mode has its own small set of fields; render them and stop.
    if (preset.mode === 'overview') {
      form.appendChild(this._row(
        t(hass, 'editorEnergyEntity'), null, { entity: {} },
        'energy_entity', this._config.energy_entity,
      ));
      form.appendChild(this._row(
        t(hass, 'editorTitle'),
        t(hass, 'editorTitleHint', { title: info.title }),
        { text: {} }, 'title', this._config.title,
      ));
      form.appendChild(this._numberRow(
        t(hass, 'editorPrice'), t(hass, 'editorPriceHint'),
        'price_per_kwh', this._config.price_per_kwh, 0, null, false, '0.32', 0.01, '',
      ));
      form.appendChild(this._sideBySide(
        this._numberRow(t(hass, 'editorBaseFeeYearly'), null, 'base_fee_yearly',
          this._config.base_fee_yearly, 0, null, false, t(hass, 'phBaseFeeYearly'), 0.01, ''),
        this._numberRow(t(hass, 'editorBaseFeeMonthly'), null, 'base_fee_monthly',
          this._config.base_fee_monthly, 0, null, false, t(hass, 'phBaseFeeMonthly'), 0.01, ''),
      ));
      form.appendChild(this._row(
        t(hass, 'editorBaseFeeMode'), null,
        { select: { mode: 'dropdown', options: [
          { value: 'accrued', label: t(hass, 'ovModeAccrued') },
          { value: 'full',    label: t(hass, 'ovModeFull') },
        ] } },
        'base_fee_mode', this._config.base_fee_mode || 'accrued',
      ));
      form.appendChild(this._row(
        t(hass, 'editorCurrency'), null, { text: {} },
        'currency', this._config.currency || 'EUR',
      ));
      form.appendChild(this._numberRow(
        t(hass, 'editorPreviousYear'), t(hass, 'editorPreviousYearHint'),
        'previous_year_kwh', this._config.previous_year_kwh, 0, null, false, t(hass, 'autoLabel'), 1, '',
      ));
      return;
    }

    if (preset.mode === 'rooms') {
      this._renderRoomsEditor(form, hass);
      return;
    }

    form.appendChild(this._row(
      info.entityDesc || t(hass, 'editorEntity'),
      preset.entity
        ? t(hass, 'editorEntityHint', { preset: info.label, entity: preset.entity })
        : t(hass, 'editorEntityRequiredHint'),
      { entity: {} },
      'entity',
      this._config.entity,
    ));

    form.appendChild(this._row(
      t(hass, 'editorTitle'),
      t(hass, 'editorTitleHint', { title: info.title }),
      { text: {} },
      'title',
      this._config.title,
    ));

    form.appendChild(this._sideBySide(
      this._numberRow(
        t(hass, 'editorTitleFontSize'),
        t(hass, 'editorTitleFontSizeHint'),
        'title_font_size',
        this._config.title_font_size,
        8, 32, true, '14',
      ),
      this._numberRow(
        t(hass, 'editorLabelFontSize'),
        t(hass, 'editorLabelFontSizeHint'),
        'label_font_size',
        this._config.label_font_size,
        6, 20, true, t(hass, 'autoLabel'),
      ),
    ));

    if (preset.supportsRange) {
      form.appendChild(this._row(
        t(hass, 'editorStatMode'),
        t(hass, 'editorStatModeHint'),
        { select: { mode: 'dropdown', options: [
          { value: 'mean',   label: t(hass, 'statModeMean') },
          { value: 'minmax', label: t(hass, 'statModeMinMax') },
        ] } },
        'stat_mode',
        this._config.stat_mode === 'minmax' ? 'minmax' : 'mean',
      ));
    }

    if (preset.supportsCapacityLine) {
      form.appendChild(this._numberRow(
        t(hass, 'editorKwp'),
        t(hass, 'editorKwpHint'),
        'kwp',
        this._config.kwp,
        0, 100, false, null, 0.1, t(hass, 'unitKwp'),
      ));
    }

    if (preset.supportsPeakPower) {
      form.appendChild(this._row(
        t(hass, 'editorPowerEntity'),
        t(hass, 'editorPowerEntityHint'),
        { entity: {} },
        'power_entity',
        this._config.power_entity,
      ));
    }

    if (preset.supportsTemperatureLine) {
      form.appendChild(this._row(
        t(hass, 'editorTemperatureEntity'),
        t(hass, 'editorTemperatureEntityHint'),
        { entity: {} },
        'temperature_entity',
        this._config.temperature_entity,
      ));
      form.appendChild(this._row(
        t(hass, 'editorTempMode'),
        t(hass, 'editorTempModeHint'),
        { select: { mode: 'dropdown', options: [
          { value: 'daily',  label: t(hass, 'tempModeDaily') },
          { value: 'minmax', label: t(hass, 'tempModeMinMax') },
          { value: 'mean',   label: t(hass, 'tempModeMean') },
        ] } },
        'temp_mode',
        this._config.temp_mode || 'daily',
      ));
    }

    if (preset.supportsDistanceLine) {
      form.appendChild(this._row(
        t(hass, 'editorDistanceEntity'),
        t(hass, 'editorDistanceEntityHint'),
        { entity: {} },
        'distance_entity',
        this._config.distance_entity,
      ));
    }

    if (preset.isRatio && preset.secondKey) {
      const lblKey = preset.secondKey === 'feedin_entity' ? 'editorFeedinEntity'
                   : preset.secondKey === 'heat_entity'   ? 'editorHeatEntity'
                   : 'editorGridEntity';
      form.appendChild(this._row(
        t(hass, lblKey),
        t(hass, lblKey + 'Hint'),
        { entity: {} },
        preset.secondKey,
        this._config[preset.secondKey],
      ));
    }

    form.appendChild(this._row(
      t(hass, 'editorYearsBack'),
      t(hass, 'editorYearsBackHint'),
      { select: { mode: 'dropdown', options: [
        { value: '0', label: t(hass, 'yearsBack0') },
        { value: '1', label: t(hass, 'yearsBack1') },
        { value: '2', label: t(hass, 'yearsBack2') },
        { value: '3', label: t(hass, 'yearsBack3') },
      ] } },
      'years_back',
      String(this._config.years_back ?? 1),
    ));

    form.appendChild(this._toggleRow(
      t(hass, 'editorShowValues'),
      t(hass, 'editorShowValuesHint'),
      'show_values',
      this._config.show_values !== false,
    ));

    form.appendChild(this._toggleRow(
      t(hass, 'editorShowLegend'),
      t(hass, 'editorShowLegendHint'),
      'show_legend',
      this._config.show_legend === true,
    ));

    // Axis scaling — available for every card type. For the percentage
    // presets (autarkie/akku) the axis stays 0-100 until y_max or a
    // headroom is set, which then zooms the axis to the data.
    form.appendChild(this._sideBySide(
      this._numberRow(
        t(hass, 'editorYMax'),
        t(hass, 'editorYMaxHint'),
        'y_max',
        this._config.y_max,
        0, 1000000, true, t(hass, 'autoLabel'), 10, '',
      ),
      this._numberRow(
        t(hass, 'editorYHeadroom'),
        t(hass, 'editorYHeadroomHint'),
        'y_headroom',
        this._config.y_headroom,
        0, 200, true, '20', 5, '%',
      ),
    ));

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = t(hass, 'sectionColors');
    form.appendChild(sectionLabel);

    const effectiveColor = this._config.color ?? preset.color;
    // Preview of the "muted color" as a blended solid color, since a
    // native <input type="color"> can't represent transparency —
    // otherwise the default preview value would look like the plain main
    // color instead of the muted color actually used in the chart.
    const effectiveDim = this._config.color_dim ?? EnergyChartsByLutarym.blendWithWhite(effectiveColor, 0x55 / 255);

    form.appendChild(this._sideBySide(
      this._colorRow(
        t(hass, 'colorCurrentYear'),
        t(hass, 'colorCurrentYearHint', { preset: info.label, color: preset.color }),
        'color',
        effectiveColor,
        this._config.color != null,
      ),
      this._colorRow(
        t(hass, 'colorPreviousYears'),
        t(hass, 'colorPreviousYearsHint', { color: preset.colorPrev }),
        'color_prev',
        this._config.color_prev ?? preset.colorPrev,
        this._config.color_prev != null,
      ),
    ));

    form.appendChild(this._sideBySide(
      this._colorRow(
        t(hass, 'colorTextValues'),
        t(hass, 'colorTextValuesHint'),
        'color_text',
        this._config.color_text ?? '#1c1c1c',
        this._config.color_text != null,
      ),
      this._colorRow(
        t(hass, 'colorDimLabel'),
        t(hass, 'colorDimHint'),
        'color_dim',
        effectiveDim,
        this._config.color_dim != null,
      ),
    ));

    form.appendChild(this._row(
      t(hass, 'editorAppearance'),
      t(hass, 'editorAppearanceHint'),
      { select: { mode: 'dropdown', options: [
        { value: 'auto',  label: t(hass, 'appearanceAuto') },
        { value: 'light', label: t(hass, 'appearanceLight') },
        { value: 'dark',  label: t(hass, 'appearanceDark') },
      ] } },
      'appearance',
      this._config.appearance || 'auto',
    ));
  }
}

customElements.define('energy-charts-by-lutarym-editor', EnergyChartsByLutarymEditor);

// ── Registration for HACS / "Add Card" dialog ──────────────────

console.info(
  `%c ENERGY CHARTS BY LUTARYM %c ${CARD_VERSION} `,
  "background:#0D131B;color:#E0762E;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#E0762E;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'energy-charts-by-lutarym',
  name: 'Energy-Charts-by-Lutarym',
  description:
    'Monthly energy charts with 13 presets: self-sufficiency, consumption, PV, wallbox, heat pump COP, battery, cost overview and per-room energy.',
  preview: true,
  documentationURL: 'https://github.com/Lutarym/Energy-Charts-by-Lutarym',
});
