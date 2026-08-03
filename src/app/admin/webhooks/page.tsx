// Webhook 清單：學生送訊息時可勾選要送到哪些「啟用中」的 webhook。
// 這裡的排列順序就是學生端勾選清單的順序（admin 用上/下移調整）。
// url 內含 secret，這裡只顯示截斷版。
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { prisma, WEBHOOK_ORDER } from "@/lib/db";
import { Badge } from "@/components/ui/primitives";
import { WebhookForm, TestWebhookButton } from "@/components/admin/WebhookForm";
import { deleteWebhookAction, toggleWebhookAction, moveWebhookAction } from "./actions";

const ICON_BTN =
  "inline-flex items-center justify-center rounded-lg border-2 border-foreground bg-card p-1.5 shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)] disabled:opacity-30 disabled:pointer-events-none";

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.slice(0, 28)}…`;
  } catch {
    return `${url.slice(0, 40)}…`;
  }
}

export default async function AdminWebhooksPage() {
  const webhooks = await prisma.webhook.findMany({ orderBy: WEBHOOK_ORDER });

  return (
    <div>
      <h1 className="font-extrabold text-2xl tracking-tight mb-2">Webhook 清單</h1>
      <p className="font-medium text-muted-foreground mb-6">
        學生只能勾選「啟用中」的 webhook；這裡由上而下的順序，就是學生端看到的順序。
        測試群請新增後停用，或用完就刪。
      </p>

      <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] mb-6">
        <h2 className="font-bold mb-3">新增 webhook</h2>
        <WebhookForm />
      </div>

      <div className="flex flex-col gap-3">
        {webhooks.map((w, i) => (
          <div
            key={w.id}
            className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[3px_3px_0_0_var(--color-foreground)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col gap-1">
                <form action={moveWebhookAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" className={ICON_BTN} disabled={i === 0} aria-label={`${w.name} 上移`}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </form>
                <form action={moveWebhookAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    className={ICON_BTN}
                    disabled={i === webhooks.length - 1}
                    aria-label={`${w.name} 下移`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
              <span className="font-mono text-xs font-bold text-muted-foreground">{i + 1}.</span>
              <span className="font-bold">{w.name}</span>
              <Badge className={w.enabled ? "bg-tone-green-badge" : "bg-muted"}>
                {w.enabled ? "啟用中" : "已停用"}
              </Badge>
              <span className="flex-1" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {truncateUrl(w.url)}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              由 {w.createdBy} 新增 · {w.createdAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TestWebhookButton id={w.id} />
              <form action={toggleWebhookAction}>
                <input type="hidden" name="id" value={w.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-card px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)]"
                >
                  {w.enabled ? "停用" : "啟用"}
                </button>
              </form>
              <form action={deleteWebhookAction}>
                <input type="hidden" name="id" value={w.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-card px-3 py-1.5 text-sm font-bold text-destructive shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)]"
                >
                  <Trash2 className="h-4 w-4" /> 刪除
                </button>
              </form>
            </div>
          </div>
        ))}

        {webhooks.length === 0 && (
          <p className="text-sm font-medium text-muted-foreground">
            還沒有任何 webhook——沒有目標前，學生無法送出訊息。
          </p>
        )}
      </div>
    </div>
  );
}
