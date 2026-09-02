<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# tpass-cross_grade_messages（T-Msg 跨屆傳訊）

學生勾選要送的屆別（＝啟用中的 Google Chat webhook，預設全選、至少一個）→ 填訊息 → 廣播。生態系總覽、`services.json` 註冊表與 `tpass` CLI 見上層 **tpass-ops** repo（`AGENTS.md`、`docs/`）。

## 鐵律

- 本機跑 `pnpm dev`（已設好 HTTPS + `msg.lvh.me:3003` + `NODE_TLS_REJECT_UNAUTHORIZED=0`；憑證在 `$HOME/tpass-certs`）。檢查用 `pnpm lint` + `pnpm exec tsc --noEmit`。
- UI 一律 light-only Neobrutalism + OKLCH，照 `tpass-portal/docs/design.md`；元件一律 import 自套件 `tpass-ui`（`Button`/`Input`/`Card`…），**不要在這裡復活 `src/components/ui/primitives.tsx`**（2026-08-29 已刪）。
- SSO 驗章在**套件 `tpass-auth-js`**（2026-08-27 起）——本 repo 只在 `src/config/auth.ts` 綁 env，callback / logout 兩條 route 各一行。四鐵則（EdDSA 鎖定 / issuer / audience / exp）在套件裡且有測試守著；要改就去 `github.com/tschoolsu/tpass-auth-js` 改，**不要在這裡復活一份手抄的 `src/lib/tpass-auth.ts`**。只碰公鑰，絕不 import auth 的私鑰。
- 網域 / issuer / audience / DB 連線全 env 驅動（`src/config/auth.ts`、`.env.local`），不寫死。
- Webhook URL 內含 secret：只存 DB（admin UI 管理），不進 git / log / 錯誤訊息，UI 顯示截斷。
- 每個 server action / route handler 內部都要重呼 `require*` guard（`src/lib/guard.ts`），不能只靠 layout 擋。
- **登出留在本服務**：`src/config/auth.ts` 的 `logoutUrl` 帶 `redirect_uri=<自己>`，auth 登出後 `303` 回首頁帶 `?logout=1`（純畫面提示，不是憑證）。`src/app/page.tsx` 對未登入訪客直接 `redirect(loginUrlFor("/"))`，所以在那之**前**攔了 `justLoggedOut`（`!session && logout==="1"`）渲染 `LoggedOutNotice`；改這段務必保留攔截順序，否則登出後會被瞬間彈回 Google 登入頁。

## 資料模型速記（`prisma/schema.prisma`）

- Webhook 顯示順序：`Webhook.sortOrder`（小的在前，平手退回 `createdAt`）。列 webhook 一律用 `WEBHOOK_ORDER`（`src/lib/db.ts`），別自己寫 orderBy。admin 上/下移＝整份重寫成 0..n-1。
- 冷卻：`UserStatus.nextAllowedAt`（null/已過 = 可傳；送出時原子 `updateMany` 搶名額；重置 = 設 null）。
- 封鎖：`bannedAt` 非 null 即封鎖，`banExpiresAt` null = 永久。
- 全域設定：`Setting` key-value（`cooldownHours` / `bannedWords`），無 row 用預設值。
- Prisma 7 + `@prisma/adapter-pg`（`src/lib/db.ts`），client 產在 gitignored 的 `src/generated/prisma`（`pnpm install` 的 postinstall 會 generate）。Schema 變更只走 `prisma migrate dev` 產 migration（不要 `db push`），部署端會跑 `prisma migrate deploy`。
