"use server";

// Webhook 清單管理。url 內含 secret：不回顯完整 URL、不寫進錯誤訊息。
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { prisma, WEBHOOK_ORDER } from "@/lib/db";
import { broadcastToWebhooks } from "@/lib/chat";

export interface WebhookResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

export async function addWebhookAction(
  _prev: WebhookResult | null,
  formData: FormData,
): Promise<WebhookResult> {
  const session = await requireAdmin("/admin/webhooks");

  const name = (formData.get("name") ?? "").toString().trim();
  const url = (formData.get("url") ?? "").toString().trim();
  if (!name) return { ok: false, error: "請填寫名稱（例如：第一屆）。" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "這不是有效的網址。" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Webhook 必須是 https:// 開頭。" };
  // 只收 Google Chat webhook：擋掉貼錯與「admin 帳號失守時把廣播導去任意主機」的 SSRF/外洩面。
  if (parsed.hostname !== "chat.googleapis.com") {
    return { ok: false, error: `Webhook 網域必須是 chat.googleapis.com（收到 ${parsed.hostname}）。` };
  }

  // 新的排在最後（＝現行「新增的排後面」行為）。
  const last = await prisma.webhook.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.webhook.create({
    data: { name, url, createdBy: session.email, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  revalidatePath("/admin/webhooks");
  revalidatePath("/");
  return { ok: true };
}

// 上/下移一格。作法：讀出目前顯示順序 → 陣列裡換位 → 整份重寫成 0..n-1。
// 不去玩「跟鄰居交換 sortOrder」那套——舊資料 sortOrder 全是預設 0，交換等於沒動；
// 整份重寫順便把並列值與空隙一次抹平，之後每次移動都在乾淨狀態下進行。
export async function moveWebhookAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/webhooks");
  const id = formData.get("id");
  const direction = formData.get("direction");
  if (typeof id !== "string" || !id) return;
  if (direction !== "up" && direction !== "down") return;

  const webhooks = await prisma.webhook.findMany({
    orderBy: WEBHOOK_ORDER,
    select: { id: true },
  });
  const from = webhooks.findIndex((w) => w.id === id);
  const to = from + (direction === "up" ? -1 : 1);
  if (from === -1 || to < 0 || to >= webhooks.length) return;

  const [moved] = webhooks.splice(from, 1);
  webhooks.splice(to, 0, moved);

  await prisma.$transaction(
    webhooks.map((w, i) =>
      prisma.webhook.update({ where: { id: w.id }, data: { sortOrder: i } }),
    ),
  );
  revalidatePath("/admin/webhooks");
  revalidatePath("/");
}

export async function toggleWebhookAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/webhooks");
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const current = await prisma.webhook.findUnique({ where: { id }, select: { enabled: true } });
    if (current) {
      await prisma.webhook.update({ where: { id }, data: { enabled: !current.enabled } });
    }
  }
  revalidatePath("/admin/webhooks");
  revalidatePath("/");
}

export async function deleteWebhookAction(formData: FormData): Promise<void> {
  await requireAdmin("/admin/webhooks");
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await prisma.webhook.delete({ where: { id } }).catch(() => {});
  }
  revalidatePath("/admin/webhooks");
  revalidatePath("/");
}

export async function sendTestWebhookAction(
  _prev: WebhookResult | null,
  formData: FormData,
): Promise<WebhookResult> {
  const session = await requireAdmin("/admin/webhooks");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "缺少 webhook。" };

  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook) return { ok: false, error: "找不到這個 webhook。" };

  const [result] = await broadcastToWebhooks(
    [webhook],
    `🔧 測試訊息 from T-Msg（由 ${session.email} 觸發）`,
  );
  if (!result.ok) {
    return { ok: false, error: `投遞失敗${result.error ? `：${result.error}` : ""}` };
  }
  return { ok: true };
}
