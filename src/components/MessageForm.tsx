"use client";

import { useActionState, useState } from "react";
import { Send, CheckCircle2, XCircle, Check } from "lucide-react";
import { sendMessageAction, type SendResult } from "@/app/actions";
import { Button, Textarea, Badge, cn } from "@/components/ui/primitives";

export interface WebhookOption {
  id: string;
  name: string;
}

export function MessageForm({
  maxLength,
  cooldownHours,
  webhooks,
}: {
  maxLength: number;
  cooldownHours: number;
  webhooks: WebhookOption[];
}) {
  const [state, action, pending] = useActionState<SendResult | null, FormData>(
    sendMessageAction,
    null,
  );
  // 預設全選＝維持「廣播到所有啟用中群組」的既有行為，想少送再自行取消勾選。
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(webhooks.map((w) => w.id)),
  );

  if (webhooks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-foreground bg-tone-orange-bg p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <p className="font-extrabold text-lg">目前沒有可傳送的目標群組</p>
        <p className="mt-2 font-medium text-muted-foreground">
          管理員尚未啟用任何群組，暫時無法傳訊，請聯絡學生會。
        </p>
      </div>
    );
  }

  if (state?.ok && state.deliveries) {
    return (
      <div className="rounded-2xl border-2 border-foreground bg-tone-green-bg p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <p className="font-extrabold text-lg">訊息已送出！</p>
        <ul className="mt-3 flex flex-col gap-2">
          {state.deliveries.map((d) => (
            <li key={d.webhookId} className="flex items-center gap-2">
              {d.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-tone-green-text" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="font-bold">{d.name}</span>
              <Badge className={d.ok ? "bg-card" : "bg-card text-destructive"}>
                {d.ok ? "送達" : `失敗${d.error ? `：${d.error}` : ""}`}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          下一則要等 {cooldownHours} 小時後才能再傳。
        </p>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const noneSelected = selected.size === 0;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[3px_3px_0_0_var(--color-foreground)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">送到哪幾屆？</span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setSelected(new Set(webhooks.map((w) => w.id)))}
            className="font-mono text-[11px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors duration-200"
          >
            全選
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="font-mono text-[11px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors duration-200"
          >
            全不選
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {webhooks.map((w) => {
            const on = selected.has(w.id);
            return (
              <label
                key={w.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-foreground px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)] has-[:focus-visible]:shadow-[3px_3px_0_0_var(--color-ring)]",
                  on ? "bg-tone-blue-badge" : "bg-card text-muted-foreground",
                )}
              >
                {/* 受控 checkbox 仍會進 FormData；sr-only 保留鍵盤操作與 a11y。 */}
                <input
                  type="checkbox"
                  name="targets"
                  value={w.id}
                  checked={on}
                  onChange={() => toggle(w.id)}
                  disabled={pending}
                  className="sr-only"
                />
                <Check className={cn("h-4 w-4 shrink-0", on ? "" : "opacity-25")} />
                {w.name}
              </label>
            );
          })}
        </div>
      </div>

      <Textarea
        name="content"
        required
        maxLength={maxLength}
        placeholder="想對同學們說什麼？"
        className="min-h-36"
        disabled={pending}
      />
      {noneSelected && (
        <p className="font-mono text-xs font-bold text-destructive">
          請至少選擇一個要傳送的群組。
        </p>
      )}
      {state?.error && (
        <p className="font-mono text-xs font-bold text-destructive">{state.error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          每 {cooldownHours} 小時限傳一則，送出後無法收回。
        </p>
        <Button type="submit" variant="primary" disabled={pending || noneSelected}>
          <Send className="h-4 w-4" /> {pending ? "傳送中…" : "送出"}
        </Button>
      </div>
    </form>
  );
}
