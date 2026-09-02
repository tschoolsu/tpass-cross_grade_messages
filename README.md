# T-Msg — 跨屆傳訊

TSchool 學生會數位服務：學生用 T-Pass SSO 登入後填一則訊息，系統廣播到各屆 Google Chat
群組（incoming webhook）。後台有訊息紀錄、禁詞過濾、每人冷卻時間、封鎖管理與 webhook 清單管理。

- 本機網址：`https://msg.lvh.me:3003`
- Stack：Next 16.3 + React 19 + Tailwind v4 + `tpass-auth-js`（SSO 驗章）+ `tpass-ui`（元件）+ Prisma 7 / PostgreSQL

| 對象 | 功能 |
| --- | --- |
| 學生（`/`） | 勾選屆別（＝啟用中的 webhook，預設全選）→ 填訊息 → 署名廣播；顯示冷卻/封鎖狀態與投遞結果 |
| 管理員（`/admin`） | 訊息紀錄（含各群組投遞狀態） |
| 管理員（`/admin/users`） | 重置冷卻、封鎖（限時或永久 + 原因）、解除封鎖 |
| 管理員（`/admin/webhooks`） | 新增/啟停/刪除/測試/排序 webhook；這頁的順序＝學生端勾選清單的順序 |
| 管理員（`/admin/settings`） | 冷卻小時數（1–168）、禁詞清單（一行一個） |

## 本機開發

```bash
cp .env.example .env.local        # 填 DATABASE_URL 等（必填清單＝src/config/*.ts 的 REQUIRED）
createdb t_msg
pnpm install                      # postinstall 會跑 prisma generate
pnpm exec prisma migrate dev      # 套用 prisma/migrations；改 schema 後也用它產新 migration
pnpm dev                          # HTTPS + msg.lvh.me:3003（憑證在 $HOME/tpass-certs）
```

多服務一起跑用上層 tpass-ops 的 `scripts/tpass dev msg`（或 `all`；第一次先 `scripts/tpass setup`）。
憑證怎麼建見 tpass-ops `docs/handbook/01-new-service.md`〈建立本機憑證〉。

提交前：`pnpm lint && pnpm exec tsc --noEmit`。

## 部署

上層 tpass-ops：`scripts/tpass deploy msg`（或 GitHub Actions 的 `deploy` workflow）。
部署會跑 `prisma migrate deploy`；schema 改動先在本機 `prisma migrate dev` 產 migration 進 git。

## 重要邊界

- Webhook URL 內含 secret：**只存 DB**、由 admin UI 管理，不進 git / log，UI 顯示截斷。
- SSO 驗章走套件 `tpass-auth-js`（`src/config/auth.ts` 綁 env），不要在這裡手抄驗章；契約見 `tpass-auth/INTEGRATION.md`。
- 更多開發約定（資料模型、登出攔截順序）見 `AGENTS.md`。
