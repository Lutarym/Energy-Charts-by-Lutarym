# Energy-Charts-by-Lutarym

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **日本語**

バージョン 2.0.0 · [変更履歴](CHANGELOG.md)

Home Assistant 用の Lovelace カスタムカードです。1枚のカードの動作を、視覚的な
設定フォームの `card_type` で選びます。ほとんどの種類は月ごとの棒グラフを描き
（本年と最大3年前まで）、いくつかは計算した比率を示し（効率、自家消費率、COP）、
2種類は棒グラフではなく数値の概要を表示します（電力概要、部屋別エネルギー）。
カードとエディターは英語・ドイツ語・フランス語・日本語の4言語に対応し、
`hass.language` に自動で従います。それ以外の言語設定では英語になります。

## カードの種類

`card_type` には13種類のプリセットがあります。以下のスクリーンショットは既定の
配色によるものです。色・タイトル・エンティティはエディターで変更できます。

### autarkie — 自給率

![自給率](Image/Autarkie.png)

自給率センサー（パーセント）の月平均です。Y軸は 0〜100 % に固定されます。
年間値は合計ではなく平均です。
既定のエンティティ：`sensor.autarkie`

### energy — 電力使用量

![電力使用量](Image/Stromverbrauchuebersicht.png)

月間使用量（kWh、月の合計）。Y軸は自動的に調整されます。
既定のエンティティ：`sensor.stromverbrauch`

### pv — 太陽光発電量

![太陽光発電量](Image/PVErtrag.png)

月間の太陽光発電量（kWh、月の合計）。任意の重ね描きが2つあります。

- `kwp`：設置容量。右側の専用 kW 目盛りに対して破線の基準線を描きます。
- `power_entity`：瞬時電力センサー（kW/W、`state_class: measurement`、たとえば
  パワーコンディショナーの交流出力）。月間ピークを各バーの上に短い線として、
  同じ右側の kW 軸上に表示します。これは発電量センサーとは**別の**エンティティ
  である必要があります。発電量センサーは積算 kWh カウンターで月間の合計のみが
  意味を持つのに対し、月間の最大値が意味を持つのは瞬時電力センサーだけだから
  です。

既定のエンティティ：`sensor.pv_ertrag`

### wallbox — EV充電器

![EV充電器](Image/Wallbox.png)

EV充電器の月間充電電力量（kWh、月の合計）。任意の重ね描き：

- `distance_entity`：オドメーターまたは走行距離センサー。右側の専用 km 目盛りに
  走行距離の折れ線を描きます（充電電力量と同じく月の合計です。走行距離には月内
  の範囲という概念がないためです）。

既定のエンティティ：`sensor.wallbox`

### wallbox_eff — EV充電の効率

![EV充電の効率](Image/WallboxLadeeffizienz.png)

系統から電力を購入せずに行われた充電の割合です。月ごとの 0〜100 % 固定の棒
グラフです。2つのエンティティが必要です。

- `entity`：EV充電器の総充電電力量（kWh）
- `grid_entity`：系統からの購入電力。**電力**（W/kW）でも**電力量**（kWh）でも
  構いません。電力の場合は記録された時間平均から月間の購入 kWh に積算されます
  （購入のみ、売電は含みません）。

月間値 =（1 − 購入kWh ÷ 充電kWh）× 100、0〜100 に制限されます。
その月に購入電力がなければ 100 % です。

集計行の年間値は電力量で重み付けされており、Σ 系統によらない kWh ÷ Σ 充電kWh
です。月ごとの比率の単純平均ではありません。

### eigenverbrauch — 自家消費率

太陽光の発電量のうち、売電せずに自家で消費した割合です。月ごとの 0〜100 % 固定
の棒グラフです。2つのエンティティが必要です。

- `entity`：太陽光発電量（kWh）
- `feedin_entity`：系統への売電量（kWh）

月間値 =（太陽光 − 売電）÷ 太陽光 × 100。どちらも直接計測された値なので、単純な
月間比率で正確です。年間値は上と同じく電力量で重み付けされます。

### cop — ヒートポンプCOP

![ヒートポンプCOP](Image/WaermepumpeCOP.png)

消費電力あたりに得られた熱量です。軸は自動調整されます。値はパーセントではなく
数値（おおむね 2〜5）で、小数点以下2桁で表示されます。2つのエンティティが必要
です。

- `entity`：消費した電力量（kWh）
- `heat_entity`：発生した熱エネルギー（kWh、たとえば HeishaMon から）

月間値 = 熱量 ÷ 電力量。意味のある値にするには実際の熱量センサーが必要です。
年間値は年間成績係数 Σ 熱量 ÷ Σ 電力量であり、12か月分の COP の平均ではあり
ません。

### wp — ヒートポンプ

![ヒートポンプ](Image/Waermepumpe.png)

ヒートポンプの月間消費電力量（kWh、月の合計）。任意の重ね描き：

- `temperature_entity`：外気温センサー。右側の専用 °C 目盛りに気温の折れ線を
  描きます（冬季は氷点下になるため、この軸には実際の最小値**と**最大値があり
  ます）。解像度は `temp_mode` で指定します。
  - `daily`（既定）：Home Assistant の履歴グラフと同じく1日1点。カード幅が
    およそ 500px を下回ると月間の最小／最大帯に、およそ 280px を下回るとさらに
    単純な月平均の折れ線に自動的に簡略化されます。いずれも同じ日次データから
    計算され、追加の問い合わせは発生しません。
  - `minmax`：常に月間の最小／最大帯と平均線。
  - `mean`：常に単純な月平均の折れ線。

既定のエンティティ：`sensor.waermepumpe`

### klima — エアコン

エアコンの月間消費電力量（kWh、月の合計）。`wp` と同じ任意の
`temperature_entity` ／ `temp_mode` の重ね描きに対応します（エアコンの使用は
暑い月に偏る傾向があるためです）。
既定のエンティティ：`sensor.klimaanlage`

### akku — 蓄電池の充電状態

![蓄電池の充電状態](Image/AkkuLadezustand.png)

蓄電池の月ごとの充電状態です。Y軸は 0〜100 % に固定されます。バーは他のすべての
プリセットと同じく常に 0 から始まります（高さ＝月平均）。表示方法は `stat_mode`
で選びます。

- `mean`（既定）：単純な月平均。
- `minmax`：月間の最小／最大をひげとして重ねます（バーと同じ目盛り上の、両端に
  キャップの付いた縦線）。この表示では個別の数値ラベルは付きません。正確な
  Ø／最小／最大の値はグラフ上の集計行にあります。

既定のエンティティ：`sensor.akku_ladezustand`

### einspeisung — 太陽光の売電

![太陽光の売電](Image/Netzeinspeisung.png)

系統への月間売電量（kWh、月の合計）。このプリセットには**既定のエンティティが
ありません**。推測したセンサー名が実際の設備に合うことはないため、設定されるまで
カードは「エンティティを選択してください」という短い案内を表示します。

### overview — 電力概要

![電力概要](Image/Stromuebersicht.png)

棒グラフではありません。本年のこれまでの電気代と使用量を数値でまとめたもので、
前年との比較を任意で表示します。設定：

- `energy_entity`：電力量センサー（kWh）。**必須**
- `price_per_kwh`：kWh あたりの単価（EUR、たとえば 32 ct/kWh なら `0.32`）。
  **必須**
- `base_fee_yearly` または `base_fee_monthly`：基本料金（どちらか一方）
- `base_fee_mode`：`accrued`（既定、経過した期間で日割り）または `full`（全額）
- `currency`：既定は `EUR`
- `previous_year_kwh`：前年値を手動で指定する任意の項目。通常は統計から自動計算
  されます（前年1月1日から12月31日）。設定すると下記の同時期比較は無効になります。

パーセントの比較は前年の**同じ期間**（1月1日から1年前の今日まで）に対して行い、
前年の通年に対しては行いません。通年と比べると結果が暦に支配されてしまい、
実際の使用量がどうであれ9月には常に大きな減少として表示されてしまうためです。

### rooms — 部屋別の電力使用量

![部屋別の電力使用量](Image/RaumEnergie.png)

棒グラフではありません。部屋ごとの年間 kWh と、住戸全体に占める割合です。設定：

- `total_entity`：全体または系統購入のメーター（任意、たとえば OBIS 1.8.0）。
  空欄にすると部屋のみの表示になります（部屋合計に対する割合、「その他」の行は
  なし）。
- `pv_entity`：太陽光発電量（任意、kWh）
- `feedin_entity`：系統への売電（任意、kWh）。`pv_entity` と `feedin_entity` を
  両方設定すると、実使用量 = 購入電力 +（太陽光発電量 − 売電）となり、
  「その他」の行と割合に太陽光の自家消費を含む実際の使用量が反映されます。
- `rooms`：最大10部屋。それぞれ自由な `name`、専用の電力量 `entity`、任意の
  現在値 `power_entity` を設定します。
- `rooms_columns`：`1`（既定）、`2`、`3`。部屋を縦に並べる代わりに横に並べ、
  部屋数が多いときもカードを小さく保ちます。2列以上ではバーが名前と数値の
  下に移り、各セルが読みやすいままになります。1列あたりおよそ 220px を下回る
  幅のカードでは、自動的に列数が減ります。

#### 自動検出

部屋を手作業で並べる代わりに、カードが自分で見つけることもできます。
エディターで**部屋を自動的に検出**をオンにするか、`rooms_auto: true` を
設定してください。

デバイスクラスが `energy` で、state class が `total` または
`total_increasing` の計器が対象です。カードが計算に使う `change` 統計を持つ
のはこれらだけだからです。対象の計器は、Home Assistant で直接またはデバイス
経由で割り当てられた**エリアごとにまとめられ**、エリアごとに1行が描かれます。
行の名前はエリア名、kWh はそのエリアの計器の合計、現在のワット数はそれらの
電力センサーの合計です。電力センサーは、末尾の語を取り除いた残りが計器と
一致するときに組になります。たとえば `sensor.wallbox_strom_energie` は
`sensor.wallbox_strom_leistung` と組になります。

エリアが未設定の計器は対象外です。その使用量が失われるわけではありません。
`total_entity` を設定していれば「その他」の行に現れます。この行は住戸全体と
一覧の部屋との差だからです。

エリアの割り当ては、`config/area_registry/list`、
`config/device_registry/list`、`config/entity_registry/list` を通じてカード
ごとに一度読み込まれます。この3つは、同じレジストリの書き込み系コマンドと
異なり管理者権限を必要としません。読み取れない場合、カードは計器ごとに1行
という動作に戻り、エディターにその旨を表示します。

設定なしで常に除外されるもの：

- 上で指定した `total_entity`、`pv_entity`、`feedin_entity`。これらを部屋
  として数えると割合が意味をなさなくなります
- 同じ計器の期間別の派生。エンティティIDに `heute`、`today`、`monat`、
  `month`、`jahr`、`year` などの語が含まれるもので判定します。ユーティリティ
  メーターのヘルパーは同じデバイスクラスを持つため、同じ使用量を二重に
  並べてしまいます
- 積算計ではないもの、たとえば単なる瞬時値のセンサー

任意のフィルターが2つあります。

- `rooms_auto_include`：IDまたは名前にこの文字列を含むエンティティのみ。
- `rooms_auto_exclude`：除外するエンティティIDまたは文字列を、カンマ区切りで
  指定します。

エディターは入力中に該当するエンティティをIDとともに一覧表示するので、保存
する前にフィルターの効果を確認できます。自動検出が有効な間、手動の `rooms`
リストは使われません。オフにすれば、そのままの内容で戻ります。

```yaml
type: custom:energy-charts-by-lutarym
card_type: rooms
rooms_auto: true
rooms_auto_exclude: sensor.reizoko_energie
total_entity: sensor.grid_import
pv_entity: sensor.pv_ertrag
feedin_entity: sensor.pv_feedin
```

## HACS からのインストール

1. HACS →**⋮**→ カスタムリポジトリ
2. このリポジトリの URL を入力し、カテゴリは **Dashboard**
3. 「Energy-Charts-by-Lutarym」をインストール
4. Home Assistant を再読み込み（必要ならブラウザーのキャッシュを消去）

## 手動インストール

`dist/energy-charts-by-lutarym.js` を `config/www/` にコピーします。

```yaml
resources:
  - url: /local/energy-charts-by-lutarym.js
    type: module
```

## 使い方

**ダッシュボードを編集 → カードを追加 →「Energy-Charts-by-Lutarym」**から追加
します。視覚的な設定フォームが直接開きます。以下のすべての項目は、この
フォームから設定するのがおすすめです。

```yaml
type: custom:energy-charts-by-lutarym
card_type: pv            # autarkie | energy | pv | wallbox | wallbox_eff | eigenverbrauch | cop | wp | klima | akku | einspeisung | overview | rooms
years_back: 2             # 任意：0 | 1 | 2 | 3 追加で表示する過去の年数（既定：1）。棒グラフのプリセットのみ
show_values: true         # 任意：各バーの上の数値（軸の目盛りではありません）、既定：true。棒グラフのプリセット
show_legend: false        # 任意：グラフ内の小さな年マーカー、既定：false
y_max: null               # 任意：Y軸の上限を固定（空欄で自動）
y_headroom: 20            # 任意：自動モードで最も高いバーの上に確保する余白（%、既定：20）

# --- akku のみ ---
stat_mode: mean           # mean | minmax（バーは0のまま、最小／最大をひげで表示、専用の軸なし）

# --- pv のみ ---
kwp: 14.4                 # 設置容量：右側のkW目盛りに対する破線の基準線
power_entity: sensor.xyz  # 瞬時電力センサー：月間ピークを各バーに線で表示

# --- wp / klima のみ ---
temperature_entity: sensor.aussentemperatur # 外気温：気温の折れ線
temp_mode: daily          # daily | minmax | mean（既定：daily）
color_temp: "#0ea5e9"    # 気温の折れ線の色（既定：スカイブルー）

# --- wallbox のみ ---
distance_entity: sensor.auto_odometer # オドメーター／走行距離センサー：走行距離の折れ線
color_distance: "#84cc16" # 走行距離の折れ線の色（既定：ライムグリーン）

# --- wallbox_eff のみ ---
grid_entity: sensor.grid_power   # 必須：系統からの購入電力（電力 W/kW または電力量 kWh）

# --- eigenverbrauch のみ ---
feedin_entity: sensor.pv_feedin  # 必須：系統への売電（kWh）

# --- cop のみ ---
heat_entity: sensor.heat_produced # 必須：発生した熱エネルギー（kWh）

# --- overview のみ ---
energy_entity: sensor.stromverbrauch # 必須
price_per_kwh: 0.32       # 必須（kWhあたりのユーロ）
base_fee_yearly: 120      # または base_fee_monthly: 10
base_fee_mode: accrued    # accrued（日割り）| full
currency: EUR
previous_year_kwh: 4200   # 任意の手動入力

# --- rooms のみ ---
total_entity: sensor.grid_import  # 任意
rooms_columns: 2                  # 任意：1 | 2 | 3
pv_entity: sensor.pv_ertrag       # 任意
# feedin_entity: sensor.pv_feedin # 任意（rooms の項を参照）
rooms:
  - name: リビング
    entity: sensor.room_living
    power_entity: sensor.room_living_power  # 任意
  - name: 書斎
    entity: sensor.room_office

# --- 外観（すべての種類） ---
color: "#f59e0b"         # 本年のメインカラー
color_prev: "#888888"    # 直前の前年の色
color_text: "#1c1c1c"    # 文字と数値の色（既定：テーマに従う）
color_dim: "#f59e0b55"   # 控えめな色（本年の過ぎた月）
appearance: auto          # auto | light | dark
title: "任意のタイトル"    # 任意：プリセットのタイトルを上書きします
title_font_size: 14       # 任意、既定 14px
label_font_size: 10       # 任意、既定：自動
```

バーにマウスを重ねると、月・年・正確な値を示す小さなツールチップが表示されます
（akku の最小／最大表示では Ø と最小／最大の範囲。pv プリセットのピーク電力の
線にも値が表示されます）。

### プリセット一覧

| card_type | 既定のエンティティ | タイトル | 色 | 追加で必要なエンティティ |
|---|---|---|---|---|
| autarkie | sensor.autarkie | 自給率 | `#22c55e` | — |
| energy | sensor.stromverbrauch | 電力使用量 | `#facc15` | — |
| pv | sensor.pv_ertrag | 太陽光発電量 | `#f59e0b` | — |
| wallbox | sensor.wallbox | EV充電器 | `#3b82f6` | — |
| wallbox_eff | *(なし)* | EV充電の効率 | `#6366f1` | `grid_entity` |
| eigenverbrauch | *(なし)* | 自家消費率 | `#84cc16` | `feedin_entity` |
| cop | *(なし)* | ヒートポンプCOP | `#d946ef` | `heat_entity` |
| wp | sensor.waermepumpe | ヒートポンプ | `#ef4444` | — |
| klima | sensor.klimaanlage | エアコン | `#06b6d4` | — |
| akku | sensor.akku_ladezustand | 蓄電池の充電状態 | `#8b5cf6` | — |
| einspeisung | *(なし)* | 太陽光の売電 | `#ec4899` | — |
| overview | *(なし)* | 電力概要 | `#0ea5e9` | `energy_entity`、`price_per_kwh` |
| rooms | *(なし)* | 部屋別の電力使用量 | `#10b981` | `rooms` のリスト |

既定のエンティティは例示です。エディターでご自身のエンティティIDを入力して
ください。*(なし)* のプリセットには既定値がまったくないため、設定されるまで
「エンティティを選択してください」という短い案内が表示されます。

## ライセンス

私的利用。
