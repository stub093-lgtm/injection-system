# CLAUDE.md

本檔提供 Claude Code 在此專案工作時的指引。**請一律使用繁體中文**（台灣用語）回覆、撰寫註解、介面文字與 commit 訊息。

## 工作規則

- **commit 或 push 之前一定要先詢問使用者**，取得同意後才執行。不要自動 commit、push、開 PR 或 merge。
- commit 訊息用繁體中文，一行說明改了什麼（參考 `git log` 既有風格，例如「成型條件加入射出時間、加料時間實際值欄位（淺藍底、選填）」）。
- 主要使用者在現場用 **iPhone Safari**（加入主畫面的 PWA）操作，修改時要顧及手機版面與載入速度。

## 專案概述

射出成型工廠管理系統（PWA，`manifest.json`，`lang: zh-TW`）。純靜態網頁，**沒有建置步驟、沒有 package.json、沒有測試**；直接用瀏覽器開啟 HTML 即可。

| 檔案 | 功能 | Firestore 集合 |
|---|---|---|
| `index.html` | MES 主程式：產品、成型條件（SOP）、下模／生產紀錄、排程試算、報價、成員管理 | `products`、`sops`（含 `history` 子集合）、`logs`、`meta/machines`、`members`、`accessRequests` |
| `prep.html` | 備貨：訂單、客戶、顏色，貼上整張單匯入 | `prepOrders`、`prepCustomers`、`prepMeta/colors`；也會讀寫 `products` |
| `inventory.html` | 原料庫存 | `invMaterials`、`invSuppliers`、`invMoves` |
| `delivery.html` | 出車紀錄 | `truckLogs` |

每個頁面都是單一 HTML 檔，內含 HTML、CSS 與 JS。

## 技術架構

- **樣式**：Tailwind CSS（`cdn.tailwindcss.com`）＋ Font Awesome 圖示。
- **後端**：Firebase v9 模組版（`FB_VER = '9.22.1'`，從 gstatic 動態 `import()`），Firebase 專案 `sunghsing`。
  - Auth：Email／密碼登入；註冊、重設密碼統一在 `index.html` 進行。
  - Firestore：用 `onSnapshot`（`includeMetadataChanges: true`）即時監聽，並用來顯示同步狀態燈。
- **兩層 script 結構**（以 `index.html` 為例）：
  - `<script type="module">`：雲端層，負責登入與資料庫，把資料放在 `window.appData`，對外只提供 `window.api.*` 方法。
  - 一般 `<script>`：畫面邏輯，只透過 `window.api` 讀寫，資料更新後由 `window.refreshAllViews()` 重繪。
  - 其他頁面依同樣模式，資料分別放在 `window.prep`、`window.inv` 等。
- **權限**：`members/{email小寫}` 文件的 `role` 欄位，值為 `admin`（管理者）、`editor`（技術員）或 `operator`（作業員）。`body[data-role]` 搭配 CSS 類別 `.need-admin`、`.need-editor` 隱藏沒有權限的功能；JS 端用 `canEdit()`、`isAdmin()` 判斷。新增需要權限的功能時，前端也要做同樣的檢查（真正的權限由 Firestore 規則把關，規則不在此 repo）。
- **寫入**：一律帶上 `stamp()`（更新時間／更新者），大量寫入用 batch（每批 ≤ 400 筆）。

## 重要注意事項

- **週期時間 `cycleTime === 999` 代表「成型數據還沒填」**（佔位值，例如從備貨頁先建立的產品）。用 `isUnfilled(p)` 判斷；這種產品的產能、排程、報價數字不能用，要提醒使用者先補資料，列表會標「成型數據未填」。不要把 999 當成真的週期拿去計算。
- **比對產品一律用料號（`p.code`）**，不要用品名或文件 id 比對。料號不可重複；匯入時料號已存在就更新、不存在就新增。

- **離線儲存要用 `enableIndexedDbPersistence`（單分頁版）**，不要改成 `enableMultiTabIndexedDbPersistence`；多分頁版在 iPhone Safari 每次開啟都會多等 20～30 秒（見 commit f1e034d）。
- `index.html` 另外把資料存在 `localStorage`（`INJECTION_MOLDING_APP_CACHE_V3`），在無法連線雲端時唯讀顯示；`INJECTION_MOLDING_APP_DATA_V1` 是舊版資料，只用於移轉。
- **防止 XSS**：使用者輸入的資料放進 `innerHTML` 之前一定要先用 `esc()` 跳脫（每頁都有這個函式）。
- 不要用 `prompt()`／`confirm()` 做輸入，改用原生 `<dialog>`（iPhone 才能叫出數字鍵盤，見 commit 64c38b2）。
- 日期使用本地時間（各頁的 `todayLocal()`），不要用 `toISOString()` 取日期，以免時區造成差一天；也要注意跨年情形。
- 產品選單有名稱搜尋（`renderSearchableProductSelect`），新增產品選單時沿用它。
- Firebase 的 `apiKey` 等設定本來就是公開的前端設定，不用當成機密處理。

## 測試方式

沒有自動化測試。修改後請用瀏覽器開啟對應頁面，手動確認：登入、各權限角色顯示、離線／同步狀態燈，以及手機寬度（約 390px）的版面。
