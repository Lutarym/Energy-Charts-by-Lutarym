# Energy-Charts-by-Lutarym

[English](README.md) · **Deutsch** · [Français](README.fr.md) · [日本語](README.ja.md)

Version 2.0.0 · [Changelog](CHANGELOG.md)

Lovelace Custom Card für Home Assistant. Eine einzige Karte, deren Verhalten
über `card_type` in einem grafischen Konfigurationsformular gewählt wird. Die
meisten Typen zeichnen monatliche Balkendiagramme (aktuelles Jahr gegen bis zu
3 Vorjahre), einige zeigen ein berechnetes Verhältnis (Effizienz,
Eigenverbrauch, COP), und zwei stellen statt Balken eine Text- und
Zahlenübersicht dar (Stromübersicht, Raum-Energie). Karte und Editor sprechen
vier Sprachen: Englisch, Deutsch, Französisch und Japanisch. Sie folgen
automatisch `hass.language`, jede andere Spracheinstellung fällt auf Englisch
zurück.

## Kartentypen

Es gibt 13 `card_type`-Vorlagen. Jeder Screenshot unten zeigt die Vorlage in
ihrer Standardgestaltung; Farbe, Titel und Entity lassen sich im Editor
überschreiben.

### autarkie — Autarkie

![Autarkie](Image/Autarkie.png)

Monatsdurchschnitt eines Autarkiegrad-Sensors in Prozent. Y-Achse fest
0–100 %. Der Jahreswert ist der Durchschnitt, nicht die Summe.
Standard-Entity: `sensor.autarkie`.

### energy — Stromverbrauch

![Stromverbrauch](Image/Stromverbrauchuebersicht.png)

Monatsverbrauch in kWh (Monatssumme). Automatisch skalierte Y-Achse.
Standard-Entity: `sensor.stromverbrauch`.

### pv — PV Ertrag

![PV Ertrag](Image/PVErtrag.png)

Monatlicher PV-Ertrag in kWh (Monatssumme). Zwei optionale Überlagerungen:

- `kwp`: installierte Leistung. Zeichnet eine gestrichelte Referenzlinie gegen
  eine eigene kW-Skala auf der rechten Seite.
- `power_entity`: ein Momentanleistungs-Sensor (kW/W, `state_class:
  measurement`, z. B. die AC-Leistung des Wechselrichters). Zeigt die
  Monatsspitze als kurzen Strich auf jedem Balken, auf derselben rechten
  kW-Achse. Das muss eine **eigene** Entity sein, getrennt vom Ertragssensor:
  der Ertragssensor ist ein kumulativer kWh-Zähler, bei dem nur eine
  Monatssumme sinnvoll ist, während nur ein Momentanleistungs-Sensor ein
  sinnvolles monatliches Maximum liefert.

Standard-Entity: `sensor.pv_ertrag`.

### wallbox — Wallbox

![Wallbox](Image/Wallbox.png)

Monatliche Ladeenergie der Wallbox in kWh (Monatssumme). Optionale
Überlagerung:

- `distance_entity`: ein Kilometerstand- oder Fahrtensensor. Zeichnet eine
  Linie der gefahrenen Kilometer auf einer eigenen km-Skala rechts (eine
  Monatssumme wie die Ladeenergie selbst, da die gefahrene Strecke keinen
  sinnvollen Bereich innerhalb des Monats hat).

Standard-Entity: `sensor.wallbox`.

### wallbox_eff — Wallbox Ladeeffizienz

![Wallbox Ladeeffizienz](Image/WallboxLadeeffizienz.png)

Anteil der Wallbox-Ladung, der ohne Netzbezug stattfand. Festes
0–100-%-Balkendiagramm je Monat. Benötigt zwei Entities:

- `entity`: gesamte Ladeenergie der Wallbox (kWh).
- `grid_entity`: Netzbezug, angegeben als **Leistung** (W/kW) oder **Energie**
  (kWh). Leistung wird aus den aufgezeichneten Stundenmittelwerten zu
  monatlichen Bezugs-kWh integriert (nur Bezug, keine Einspeisung).

Monatswert = (1 − Netzbezug_kWh ÷ Ladung_kWh) × 100, begrenzt auf 0–100.
Kein Netzbezug in einem Monat bedeutet 100 %.

Der Jahreswert in der Summenzeile ist energiegewichtet, also
Σ netzfreie kWh ÷ Σ geladene kWh, nicht der Durchschnitt der Monatsquoten.

### eigenverbrauch — Eigenverbrauchsquote

Anteil der PV-Erzeugung, der im Haus verbraucht statt eingespeist wurde.
Festes 0–100-%-Balkendiagramm je Monat. Benötigt zwei Entities:

- `entity`: PV-Ertrag (kWh).
- `feedin_entity`: Netzeinspeisung (kWh).

Monatswert = (PV − Einspeisung) ÷ PV × 100. Beide Werte sind direkt gemessen,
das einfache Monatsverhältnis ist daher exakt. Der Jahreswert ist wie oben
energiegewichtet.

### cop — Wärmepumpe COP

![Wärmepumpe COP](Image/WaermepumpeCOP.png)

Erzeugte Wärme je eingesetzter Stromeinheit. Automatisch skalierte Achse; der
Wert ist eine Zahl (typisch etwa 2–5), kein Prozentwert, mit 2 Nachkommastellen.
Benötigt zwei Entities:

- `entity`: verbrauchte elektrische Energie (kWh).
- `heat_entity`: erzeugte thermische Energie (kWh, z. B. aus HeishaMon).

Monatswert = Wärme ÷ Strom. Braucht einen echten Wärmemengensensor, um
aussagekräftig zu sein. Der Jahreswert ist die Jahresarbeitszahl
Σ Wärme ÷ Σ Strom, nicht der Durchschnitt der zwölf Monats-COPs.

### wp — Wärmepumpe

![Wärmepumpe](Image/Waermepumpe.png)

Monatlicher Stromverbrauch der Wärmepumpe in kWh (Monatssumme). Optionale
Überlagerung:

- `temperature_entity`: ein Außentemperatursensor. Zeichnet eine
  Temperaturlinie auf einer eigenen °C-Skala rechts (diese Achse hat ein
  echtes Minimum **und** Maximum, da Wintermonate ins Negative gehen).
  Auflösung über `temp_mode`:
  - `daily` (Standard): ein Punkt je Kalendertag, wie im Verlaufsdiagramm von
    Home Assistant. Vereinfacht sich unterhalb von etwa 500 px Kartenbreite
    automatisch zu einem monatlichen Min/Max-Band, unterhalb von etwa 280 px
    zu einer einfachen Monatsmittellinie, jeweils aus denselben Tagesdaten
    ohne zusätzliche Abfrage.
  - `minmax`: immer ein monatliches Min/Max-Band plus Mittellinie.
  - `mean`: immer eine einfache Monatsmittellinie.

Standard-Entity: `sensor.waermepumpe`.

### klima — Klimaanlage

Monatlicher Stromverbrauch der Klimaanlage in kWh (Monatssumme). Unterstützt
dieselbe optionale `temperature_entity` / `temp_mode`-Überlagerung wie `wp`
(mehr Klimabetrieb fällt meist in die heißeren Monate).
Standard-Entity: `sensor.klimaanlage`.

### akku — Akku-Ladezustand

![Akku-Ladezustand](Image/AkkuLadezustand.png)

Monatlicher Ladezustand des Akkus. Y-Achse fest 0–100 %. Der Balken beginnt
immer bei 0 (Höhe = Monatsmittel, wie bei allen anderen Vorlagen).
`stat_mode` wählt die Darstellung:

- `mean` (Standard): einfacher Monatsdurchschnitt.
- `minmax`: das monatliche Min/Max wird als Whisker überlagert (eine
  senkrechte Linie mit Endkappen, auf derselben Skala wie der Balken). In
  diesem Modus gibt es keine eigene Zahlenbeschriftung; die genauen
  Ø/Min/Max-Werte stehen in der Summenzeile über dem Diagramm.

Standard-Entity: `sensor.akku_ladezustand`.

### einspeisung — PV Netz-Einspeisung

![PV Netz-Einspeisung](Image/Netzeinspeisung.png)

Monatliche Netzeinspeisung in kWh (Monatssumme). Diese Vorlage hat **keine
Standard-Entity**: ein geratener Sensorname würde in keiner echten Anlage
passen, deshalb zeigt die Karte einen kurzen Hinweis "Entity auswählen", bis
eine konfiguriert ist.

### overview — Stromübersicht

![Stromübersicht](Image/Stromuebersicht.png)

Kein Balkendiagramm. Eine Text- und Zahlenübersicht über Stromkosten und
Verbrauch des laufenden Jahres, mit optionalem Vorjahresvergleich.
Konfiguration:

- `energy_entity`: Energiesensor (kWh). **Pflicht.**
- `price_per_kwh`: Preis pro kWh in EUR (z. B. `0.32` für 32 ct/kWh).
  **Pflicht.**
- `base_fee_yearly` oder `base_fee_monthly`: Grundgebühr (eines von beiden).
- `base_fee_mode`: `accrued` (Standard, anteilig zum abgelaufenen Teil des
  Jahres) oder `full` (der volle Betrag).
- `currency`: Standard `EUR`.
- `previous_year_kwh`: optionale manuelle Vorgabe für den Vorjahreswert.
  Normalerweise automatisch aus der Statistik berechnet (1.1. bis 31.12. des
  Vorjahres); wird er gesetzt, entfällt der Zeitraumvergleich weiter unten.

Der Prozentvergleich läuft gegen den **gleichen Zeitraum** des Vorjahres
(1.1. bis zum heutigen Datum vor einem Jahr), nicht gegen das volle Vorjahr.
Ein Vergleich mit dem vollen Vorjahr wäre vom Kalender bestimmt: im September
stünde dort immer ein großes Minus, egal wie sich der Verbrauch entwickelt hat.

### rooms — Stromverbrauch Räume

![Stromverbrauch Räume](Image/RaumEnergie.png)

Kein Balkendiagramm. Jahres-kWh je Raum mit dem prozentualen Anteil am
Hausverbrauch. Konfiguration:

- `total_entity`: Gesamt- oder Netzbezugszähler (optional, z. B. OBIS 1.8.0).
  Leer lassen für eine reine Raumansicht (Anteil an der Raumsumme, ohne Zeile
  "Sonstige").
- `pv_entity`: PV-Ertrag (optional, kWh).
- `feedin_entity`: Netzeinspeisung (optional, kWh). Sind `pv_entity` und
  `feedin_entity` beide gesetzt, gilt: echter Verbrauch = Netzbezug +
  (PV-Ertrag − Einspeisung). Die Zeile "Sonstige" und die Anteile geben dann
  den tatsächlichen Verbrauch einschließlich PV-Eigenverbrauch wieder.
- `rooms`: bis zu 10 Räume, jeder mit frei wählbarem `name`, eigener Energie-
  `entity` und optionaler Live-`power_entity`.

#### Automatische Erkennung

Statt die Räume von Hand einzutragen, kann die Karte sie selbst finden. Im
Editor **Räume automatisch erkennen** einschalten oder `rooms_auto: true`
setzen.

Ein Zähler kommt in Frage, wenn er die Geräteklasse `energy` und eine
State-Class `total` oder `total_increasing` hat. Nur für diese gibt es die
`change`-Statistik, mit der die Karte rechnet. Die passenden Zähler werden
dann **nach dem Bereich gruppiert**, dem sie in Home Assistant zugeordnet
sind, direkt oder über ihr Gerät. Je Bereich entsteht eine Zeile: der Name
ist der Bereichsname, die kWh sind die Summe der Zähler dieses Bereichs, und
der Live-Wattwert ist die Summe ihrer Leistungssensoren. Ein Leistungssensor
gehört zu einem Zähler, wenn beide Entity-IDs nach dem Abschneiden des
letzten Wortes denselben Stamm haben, so findet
`sensor.wallbox_strom_energie` seinen Partner
`sensor.wallbox_strom_leistung`.

Zähler ohne Bereich bleiben außen vor. Ihr Verbrauch geht nicht verloren:
mit gesetzter `total_entity` erscheint er in der Zeile "Sonstige", die die
Differenz zwischen Hausverbrauch und den gelisteten Räumen ist.

Die Bereichszuordnung wird einmal je Karte über
`config/area_registry/list`, `config/device_registry/list` und
`config/entity_registry/list` gelesen. Diese drei sind nicht adminpflichtig,
anders als die Schreibbefehle derselben Registries. Sind sie nicht lesbar,
fällt die Karte auf eine Zeile je Zähler zurück und sagt das im Editor.

Immer ausgeschlossen, ohne Konfiguration:

- die oben gesetzten `total_entity`, `pv_entity` und `feedin_entity`. Als
  Raum gezählt würden sie die Prozentanteile unbrauchbar machen
- Zeitraum-Varianten desselben Zählers, erkannt an einem Wort wie `heute`,
  `taeglich`, `monat`, `jahr` oder `today` in der Entity-ID.
  Utility-Meter-Helfer tragen dieselbe Geräteklasse und würden denselben
  Verbrauch ein zweites Mal auflisten
- alles, was kein Zähler ist, etwa ein reiner Momentanwert

Zwei optionale Filter:

- `rooms_auto_include`: nur Entities, deren ID oder Name diesen Text enthält.
- `rooms_auto_exclude`: kommagetrennte Entity-IDs oder Textteile, die
  wegfallen sollen.

Der Editor listet jeden Treffer mit Entity-ID schon beim Tippen auf, du
siehst also vor dem Speichern, was ein Filter bewirkt. Bei aktiver Automatik
wird die manuelle `rooms`-Liste ignoriert; beim Ausschalten ist sie
unverändert wieder da.

```yaml
type: custom:energy-charts-by-lutarym
card_type: rooms
rooms_auto: true
rooms_auto_exclude: sensor.kuehlschrank_energie
total_entity: sensor.grid_import
pv_entity: sensor.pv_ertrag
feedin_entity: sensor.pv_feedin
```

## Installation über HACS

1. HACS → **⋮** → Benutzerdefinierte Repositories
2. URL dieses Repositorys eintragen, Kategorie **Dashboard**
3. "Energy-Charts-by-Lutarym" installieren
4. Home Assistant neu laden (bei Bedarf den Browser-Cache leeren)

## Manuelle Installation

`dist/energy-charts-by-lutarym.js` nach `config/www/` kopieren:

```yaml
resources:
  - url: /local/energy-charts-by-lutarym.js
    type: module
```

## Verwendung

Hinzufügen über **Dashboard bearbeiten → Karte hinzufügen →
"Energy-Charts-by-Lutarym"**. Das öffnet direkt das grafische
Konfigurationsformular, der empfohlene Weg für alle Optionen unten.

```yaml
type: custom:energy-charts-by-lutarym
card_type: pv            # autarkie | energy | pv | wallbox | wallbox_eff | eigenverbrauch | cop | wp | klima | akku | einspeisung | overview | rooms
years_back: 2             # optional: 0 | 1 | 2 | 3 zusätzliche Vorjahre (Standard: 1); nur Balken-Vorlagen
show_values: true         # optional: Zahl über jedem Balken (nicht die Achsenskala), Standard: true; Balken-Vorlagen
show_legend: false        # optional: kleine Jahres-Marker im Diagramm, Standard: false
y_max: null               # optional: fester oberer Wert der Y-Achse (leer lassen für automatisch)
y_headroom: 20            # optional: zusätzlicher Platz in % über dem höchsten Balken im Automatikmodus (Standard: 20)

# --- nur akku ---
stat_mode: mean           # mean | minmax (Balken bleibt bei 0, Min/Max als Whisker, keine eigene Achse)

# --- nur pv ---
kwp: 14.4                 # installierte Leistung: gestrichelte Referenzlinie gegen eine kW-Skala rechts
power_entity: sensor.xyz  # Momentanleistungs-Sensor: Monatsspitze als Strich je Balken

# --- nur wp / klima ---
temperature_entity: sensor.aussentemperatur # Außentemperatur: Temperaturlinie
temp_mode: daily          # daily | minmax | mean (Standard: daily)
color_temp: "#0ea5e9"    # Farbe der Temperaturlinie (Standard: Himmelblau)

# --- nur wallbox ---
distance_entity: sensor.auto_odometer # Kilometerstand-/Fahrtensensor: Linie der gefahrenen km
color_distance: "#84cc16" # Farbe der Kilometerlinie (Standard: Limettengrün)

# --- nur wallbox_eff ---
grid_entity: sensor.grid_power   # Pflicht: Netzbezug (Leistung W/kW oder Energie kWh)

# --- nur eigenverbrauch ---
feedin_entity: sensor.pv_feedin  # Pflicht: Netzeinspeisung (kWh)

# --- nur cop ---
heat_entity: sensor.heat_produced # Pflicht: erzeugte thermische Energie (kWh)

# --- nur overview ---
energy_entity: sensor.stromverbrauch # Pflicht
price_per_kwh: 0.32       # Pflicht (EUR pro kWh)
base_fee_yearly: 120      # oder base_fee_monthly: 10
base_fee_mode: accrued    # accrued (anteilig) | full
currency: EUR
previous_year_kwh: 4200   # optionale manuelle Vorgabe

# --- nur rooms ---
total_entity: sensor.grid_import  # optional
pv_entity: sensor.pv_ertrag       # optional
# feedin_entity: sensor.pv_feedin # optional (siehe Abschnitt rooms)
rooms:
  - name: Wohnzimmer
    entity: sensor.room_wohnzimmer
    power_entity: sensor.room_wohnzimmer_power  # optional
  - name: Büro
    entity: sensor.room_buero

# --- Darstellung (alle Typen) ---
color: "#f59e0b"         # Hauptfarbe für das aktuelle Jahr
color_prev: "#888888"    # Farbe für das unmittelbare Vorjahr
color_text: "#1c1c1c"    # Farbe für Text und Werte (Standard: folgt dem Theme)
color_dim: "#f59e0b55"   # gedämpfte Farbe (vergangene Monate, aktuelles Jahr)
appearance: auto          # auto | light | dark
title: "Mein Titel"       # optional: überschreibt den Titel der Vorlage
title_font_size: 14       # optional, Standard 14px
label_font_size: 10       # optional, Standard: automatisch
```

Beim Überfahren eines Balkens mit der Maus erscheint ein kleiner Tooltip mit
Monat, Jahr und dem genauen Wert (Ø mit Min/Max-Bereich im akku-Min/Max-Modus;
die Spitzenleistungs-Striche der pv-Vorlage zeigen ebenfalls ihren Wert).

### Übersicht der Vorlagen

| card_type | Standard-Entity | Titel | Farbe | Zusätzlich nötige Entity |
|---|---|---|---|---|
| autarkie | sensor.autarkie | Autarkie | `#22c55e` | — |
| energy | sensor.stromverbrauch | Stromverbrauch | `#facc15` | — |
| pv | sensor.pv_ertrag | PV Ertrag | `#f59e0b` | — |
| wallbox | sensor.wallbox | Wallbox | `#3b82f6` | — |
| wallbox_eff | *(keine)* | Wallbox Ladeeffizienz | `#6366f1` | `grid_entity` |
| eigenverbrauch | *(keine)* | Eigenverbrauchsquote | `#84cc16` | `feedin_entity` |
| cop | *(keine)* | Wärmepumpe COP | `#d946ef` | `heat_entity` |
| wp | sensor.waermepumpe | Wärmepumpe | `#ef4444` | — |
| klima | sensor.klimaanlage | Klimaanlage | `#06b6d4` | — |
| akku | sensor.akku_ladezustand | Akku-Ladezustand | `#8b5cf6` | — |
| einspeisung | *(keine)* | PV Netz-Einspeisung | `#ec4899` | — |
| overview | *(keine)* | Stromübersicht | `#0ea5e9` | `energy_entity`, `price_per_kwh` |
| rooms | *(keine)* | Stromverbrauch Räume | `#10b981` | Liste `rooms` |

Die Standard-Entities sind Platzhalter; trage im Editor deine tatsächliche
Entity-ID ein. Vorlagen mit *(keine)* haben überhaupt keinen Standard und
zeigen einen kurzen Hinweis "Entity auswählen", bis eine konfiguriert ist.

## Lizenz

Private Nutzung.
