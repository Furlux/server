type TNotifyOrder = {
  id: number;
  documentId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  telegramUserId?: bigint | number | string | null;
  totalPrice?: number | null;
  currency?: string | null;
  items?: unknown;
  phone?: string | null;
};

type TOrderItem = { productName?: string; quantity?: number; price?: number };

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const MANAGER_CHAT_ID = process.env.MANAGER_TG_CHAT_ID;
const BOT_USERNAME = process.env.BOT_USERNAME;

console.log('[notify] MANAGER_CHAT_ID =', JSON.stringify(MANAGER_CHAT_ID));

// inputs chatId + html text + optional replyMarkup, does POST to Telegram sendMessage API with 5s timeout, returns void
const sendMessage = async (
  chatId: string | number,
  text: string,
  replyMarkup?: object,
): Promise<void> => {
  if (!BOT_TOKEN) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[notify] Telegram API error:', res.status, JSON.stringify(body));
    }
  } catch (err) {
    console.error('[notify] sendMessage error:', err);
  }
};

// inputs items JSON, does format to bullet list, returns string
const buildItemsText = (items: unknown): string => {
  if (!Array.isArray(items) || items.length === 0) return '';
  return '\n' + (items as TOrderItem[])
    .map((i) => `• ${i.quantity ?? 1}x ${i.productName ?? 'Товар'} — ${i.price ?? 0} UAH`)
    .join('\n');
};

// inputs order, does build tappable tg link or plain name, returns html string
const clientLink = (order: TNotifyOrder): string => {
  const name = `${order.firstName ?? ''} ${order.lastName ?? ''}`.trim() || 'Клієнт';
  return order.telegramUserId
    ? `<a href="tg://user?id=${order.telegramUserId}">${name}</a>`
    : name;
};


// inputs order, does send "new order" notification to manager group, returns void
export const notifyManagerNewOrder = async (order: TNotifyOrder): Promise<void> => {
  if (!MANAGER_CHAT_ID) return;
  const text = [
    `🆕 <b>Нове замовлення #${order.id}</b>`,
    `👤 ${clientLink(order)}`,
    `📱 ${order.phone ?? '—'}`,
    buildItemsText(order.items),
    `💰 <b>${order.totalPrice ?? 0} ${order.currency ?? 'UAH'}</b>`,
  ].filter(Boolean).join('\n');
  await sendMessage(MANAGER_CHAT_ID, text);
};

// inputs order, does send "order paid" notification to manager group, returns void
export const notifyManagerOrderPaid = async (order: TNotifyOrder): Promise<void> => {
  if (!MANAGER_CHAT_ID) return;
  const text = [
    `✅ <b>Замовлення #${order.id} оплачено!</b>`,
    `👤 ${clientLink(order)}`,
    `📱 ${order.phone ?? '—'}`,
    `💰 <b>${order.totalPrice ?? 0} ${order.currency ?? 'UAH'}</b>`,
  ].join('\n');
  await sendMessage(MANAGER_CHAT_ID, text);
};

const STATUS_MESSAGES: Partial<Record<string, string>> = {
  processing: '⏳ Ваше замовлення <b>#%id%</b> прийнято і обробляється.',
  shipped:    '🚚 Ваше замовлення <b>#%id%</b> відправлено! Очікуйте доставку.',
  delivered:  '✅ Ваше замовлення <b>#%id%</b> доставлено. Дякуємо за покупку!',
  cancelled:  '❌ Ваше замовлення <b>#%id%</b> скасовано.',
};

// inputs order + new status, does send status update with order command link directly to customer, returns void
export const notifyCustomerStatusChanged = async (order: TNotifyOrder, status: string): Promise<void> => {
  if (!order.telegramUserId || !BOT_TOKEN) return;
  const template = STATUS_MESSAGES[status];
  if (!template) return;
  const text = template.replace('%id%', String(order.id)) + `\nДеталі: /order_${order.id}`;
  await sendMessage(String(order.telegramUserId), text);
};
