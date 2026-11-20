# AGENTS.md — 本專案唯一的 AI 工作規則

任何模型（Claude、Gemini、GPT…）在這個 repo 工作都以本檔為準。`CLAUDE.md`、`GEMINI.md` 只是指到這裡，**規則只寫在本檔，不要複製到別處**。

使用者不看程式碼、主要用 iPhone 操作。回覆、註解、介面文字、commit 訊息一律**繁體中文（台灣用語）**；回報時說「改了什麼、畫面上哪裡會不一樣、要怎麼確認」，不要貼大段程式碼。

## 1. 工作規則（硬性）

1. **commit、push、開 PR、merge 之前一定先問**。不直接 push `main`（`main` 就是線上版，GitHub Pages 直接發布）。
2. **沒被要求就不動畫面**：不改版面、顏色、文字、按鈕位置、操作步驟。
3. **最小修改**：只改需求相關的行。不重新排版、不改縮排、不順手重構、不改名、不把寫法「現代化」。
4. **不加東西**：不引入框架、建置工具、npm 套件、新的 CDN；不升級 Firebase／Tailwind／Font Awesome 版本。
5. **改 Firestore 資料結構、刪除資料、動到 §5 的跨頁項目之前先問**。
6. 一次只做一件需求，做完跑 §8 的檢查再回報。

## 2. 省 token 的讀檔流程

`index.html` 約 20 萬字元，**禁止整檔讀取**；其他頁面也一樣先找再讀。

1. 先 `grep -n` 找錨點（下表），再只讀那一段（通常 50～150 行）。
2. 行號會變，**永遠用錨點文字找位置**，不要相信舊的行號。
3. 改函式名稱或 DOM id 前，先 `grep` 全部四個 HTML（inline `onclick=` 直接呼叫全域函式名）。
4. 新增一段功能時，照同樣格式加上區段註解，讓下一次找得到。

每頁固定四大塊，由上到下：

| 區塊 | 錨點（grep 這個字串） | 內容 |
|---|---|---|
| 畫面 HTML | `<!-- ====================` | 各分頁、Modal |
| 純計算 | `<script id="prep-core">`／`inv-core`／`truck-core` | 無 DOM、無雲端的計算（`index.html` 目前沒有這一塊） |
| 雲端層 | `<script type="module">` | 登入、Firestore、`window.api` |
| 畫面邏輯 | 雲端層 `</script>` 後的下一個 `<script>` | render、事件處理 |

`index.html` 畫面邏輯的區段錨點：`共用工具`、`產品分類`、`合併重複產品`、`批次貼上產品`、`SOP 修改紀錄`、`生產試算`、`報價試算`、`登入畫面`、`人員權限`、`機台清單`。HTML 的錨點是 `模組一`～`模組六`。

## 3. 專案概述

射出成型工廠管理系統（PWA）。純靜態網頁，**沒有建置步驟、沒有 package.json**，直接部署到 GitHub Pages。Firebase 專案 `sunghsing`。

| 檔案 | 功能 | 資料變數 | 擁有的 Firestore 集合 |
|---|---|---|---|
| `index.html` | MES：產品、成型條件（SOP）、下模紀錄、試算、報價、成員 | `window.appData` | `products`、`sops`（含 `history`）、`logs`、`meta/machines`、`members`、`accessRequests` |
| `prep.html` | 備貨：訂單、客戶、顏色 | `window.prep` | `prepOrders`、`prepCustomers`、`prepMeta/colors` |
| `inventory.html` | 原料庫存 | `window.inv` | `invMaterials`、`invSuppliers`、`invMoves` |
| `delivery.html` | 出車紀錄 | `window.tk` | `truckLogs` |

樣式用 Tailwind CDN＋Font Awesome；Firebase v9 模組版（`FB_VER = '9.22.1'`）從 gstatic 動態 `import()`。

## 4. 分層規則（寫程式一律照這個方向）

```
畫面 HTML（onclick） → 畫面邏輯 → window.api → 雲端層 → Firestore
                         ↓
                      純計算（core）
```

- **畫面邏輯**：只能「讀」`window.appData`／`prep`／`inv`／`tk`，不可直接改它；要寫入一律呼叫 `window.api.*`。不可出現 `fs.`、`db`、集合名稱字串。
- **雲端層**：唯一可以碰 Firestore 的地方。收到資料後更新資料變數，再呼叫重繪（`refreshAllViews()` 或 `renderAll()`）。不要在這裡組畫面 HTML。
- **純計算（core）**：不碰 DOM、不碰雲端、不讀全域資料，只吃參數回傳結果。新的計算邏輯（金額、庫存、里程、解析貼上文字）優先放這裡。
- 寫入一律帶 `stamp()`；大量寫入用 batch，每批 ≤ 400 筆。
- 同一份對照只寫一次再共用（例如 `SOP_FIELDS` 同時給載入與儲存用），不要在兩個函式各寫一份欄位清單。

## 5. 跨頁耦合清單（改到這些，要一起改、而且先問）

| # | 項目 | 牽涉檔案 | 規則 |
|---|---|---|---|
| A | 四頁各自有一份相同的起手式：`firebaseConfig`、`FB_VER`、`ROLE_LABEL`、`emailKey`、`showScreen`、`errMsg`、`bg`、`stamp`、`handleUser`、`esc`、`todayLocal`、`canEdit` | 四頁 | 改其中一個就 `grep` 四頁一起改。注意既有差異不要「統一」掉：`index.html` 的提示是 `showToast`、其他頁是 `toast`；`delivery.html` 的 `bg` 會回傳 promise 並重丟錯誤；只有 `index.html` 有註冊／驗證／待開通畫面 |
| B | `products` 集合 | `index.html`（全部欄位）、`prep.html`（讀；寫 `shipCode`、`colors`；建佔位產品） | 改產品欄位名稱或意義時兩頁都要查。`prep.html` 建的產品**沒有 `sops` 文件**，所以 `index.html` 讀 SOP 一律寫 `appData.sops[id] \|\| {}` |
| C | 佔位產品：`cycleTime === 999` | `prep.html` 的 `PLACEHOLDER_MOLD`、`index.html` 的 `isUnfilled()` | 判斷一律用 `isUnfilled(p)`，不要直接寫 `=== 999`。999 不可拿去計算 |
| D | `prepMeta/colors` 顏色名單 | `prep.html` 寫、`index.html` 讀成 `appData.shipColors`、`inventory.html` 讀成 `inv.colors`（原料顏色下拉） | 改結構三頁一起改 |
| E | `prepOrders` 的 `lines.{lineId}.productId`／`.name` | `prep.html`；`index.html` 的 `mergeProducts` 會改寫它 | 改訂單品項結構時，`mergeProducts` 一定要跟著改 |
| F | `members/{email小寫}.role`（`admin`／`editor`／`operator`） | 四頁 | 用 `body[data-role]`＋`.need-admin`／`.need-editor` 隱藏，JS 用 `canEdit()`／`isAdmin()`。真正的權限在 Firestore 規則（不在此 repo），**新增集合要提醒使用者去加規則** |
| G | `index.html` 雲端層直接碰這些 DOM id：`printable-sop-card`、`user-chip`、`sync-status-indicator`、`migration-banner`、`migration-summary`、`offline-banner`、`log-date`、`auth-*` | `index.html` | 這些 id 不可改名、不可刪 |
| H | `DEFAULT_SOP` 定義在畫面邏輯，雲端層的 `saveProductsBatch` 也會用 | `index.html` | 不可搬進函式內或改名 |
| I | `logs` 內的 `productCode`、`productName`、`cycleTime`、`cavities` 是當時的快照 | `index.html` | **故意重複存**，用來保住歷史達成率，不要「正規化」掉 |
| J | 本機快取 `INJECTION_MOLDING_APP_CACHE_V3` 存整份 `appData` | `index.html` | 在 `appData` 加大型資料前先想容量（localStorage 約 5MB） |
| K | `invMaterials` 原料品項 | `inventory.html` 寫、`index.html` 讀成 `appData.invMaterials`（下模紀錄選原料） | 品項名稱規則 `INV.materialName` 與 `index.html` 的 `invMaterialName` 要一致；下模紀錄的 `materialName`、`partWeight`、`runnerWeight` 是快照（同 I） |
| L | `invMoves` 退料 | `inventory.html` | 退料（`type:'return'`）用 `drawId` 對應領料，0 kg 代表全部用完；下模紀錄**不寫入**庫存帳，只算理論用量，避免和領料重複扣 |
| M | `prepCustomers` 客戶名單 | `prep.html` 寫、`delivery.html` 讀成 `tk.customers`（出車表單客戶打字建議） | 改結構兩頁一起改 |

## 6. 常見修改的做法

**在既有資料加一個欄位**（例：產品加「每件個數」）
1. 畫面 HTML 的表單加輸入框（沿用旁邊欄位的 class）。
2. 畫面邏輯：開啟表單時填值、儲存時讀值、清單顯示時加上（記得 `esc()`）。
3. 雲端層通常不用改（整個物件一起存）。舊資料沒有這個欄位，讀取時一律給預設值（`p.x || ''`、`Number(p.x) || 0`）。
4. SOP 欄位只要在 `SOP_FIELDS` 加一行＋HTML 加輸入框。
5. 對照 §5 的 B，確認另一頁要不要跟著顯示。

**加一個新的資料集合**：集合名稱加頁面前綴（`prep…`、`inv…`）→ 雲端層加 `listen(...)` 與 `window.api` 方法 → 畫面邏輯只呼叫 api → 更新 §3 表格 → 提醒使用者加 Firestore 規則。

**加一個新頁面**：複製 `inventory.html`（結構最乾淨）當範本，保留四大塊與登入流程，改集合名稱與資料變數，並在 `index.html` 加連結、更新 §3 與 §5-A。

**加需要權限的功能**：按鈕加 `.need-editor` 或 `.need-admin`，處理函式開頭再用 `canEdit()`／`isAdmin()` 擋一次。

## 7. 重要注意事項

- **比對產品一律用料號 `p.code`**，不要用品名。料號不可重複；匯入時已存在就更新、不存在就新增。
- **離線儲存用 `enableIndexedDbPersistence`（單分頁版）**，不可改成多分頁版（iPhone Safari 每次開啟會多等 20～30 秒）。
- **防 XSS**：使用者輸入的內容放進 `innerHTML` 前一定先 `esc()`。
- **不要用 `prompt()`／`confirm()` 做輸入**，用原生 `<dialog>`（iPhone 才叫得出數字鍵盤）。
- **日期用各頁的 `todayLocal()`**，不要用 `toISOString()` 取日期（會差一天）。
- 產品下拉選單沿用 `renderSearchableProductSelect`（可打字搜尋）。
- `INJECTION_MOLDING_APP_DATA_V1` 是舊版資料，只用於移轉，不要再寫入。
- Firebase 的 `apiKey` 是公開的前端設定，不是機密。

## 8. 修改後的檢查

1. `node tools/check.mjs`（或加檔名只檢查一頁）— 語法檢查，必須全部 ✓。
2. `git diff --stat` — 確認只動到預期的檔案與行數；行數遠多於預期代表改過頭了。
3. 請使用者在 iPhone 實機確認：登入、該功能、同步狀態燈。沒有自動化測試，**不要自稱「已測試」**，只能說「語法檢查通過，請實機確認」。

## 9. 已知技術債（使用者沒要求就不要動）

依風險由低到高，一次只做一項，各自一個 commit：

1. `index.html` 的計算邏輯（試算、報價、`logStdQty`）搬成 `mes-core` 純計算區塊，比照其他三頁。
2. §5-A 的重複起手式抽成共用檔 `shared.js`。好處是四頁不必同步改；代價是多一個網路請求，且一旦出錯四頁同時壞。**必須在使用者能實機測試四頁登入時才做**。
3. `logs`、`invMoves`、`truckLogs` 目前每次都監聽整個集合，資料量大了以後載入會變慢、本機快取會滿；到時改成只載近幾個月。
4. `index.html` 依模組拆成多個檔案。可大幅減少每次修改要讀的量，但變動最大，放最後。
