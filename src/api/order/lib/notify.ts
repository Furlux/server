import { buildItemsText, clientName } from './order-summary';

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

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const MANAGER_CHAT_ID = '-1003985153085';
const BOT_USERNAME = process.env.BOT_USERNAME;

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

// inputs telegramUserId, does build inline keyboard with tg deep link button, returns object or undefined
const clientButton = (telegramUserId: TNotifyOrder['telegramUserId']) =>
  telegramUserId
    ? { inline_keyboard: [[{ text: '💬 Написати клієнту', url: `tg://user?id=${telegramUserId}` }]] }
    : undefined;

// inputs order, does send "new order" notification to manager group, returns void
export const notifyManagerNewOrder = async (order: TNotifyOrder): Promise<void> => {
  if (!MANAGER_CHAT_ID) return;
  const text = [
    `🆕 <b>Нове замовлення #${order.id}</b>`,
    `👤 ${clientName(order)}`,
    `📱 ${order.phone ?? '—'}`,
    buildItemsText(order.items),
    `💰 <b>${order.totalPrice ?? 0} ${order.currency ?? 'UAH'}</b>`,
  ].filter(Boolean).join('\n');
  await sendMessage(MANAGER_CHAT_ID, text, clientButton(order.telegramUserId));
};

// inputs order, does send "order paid" notification to manager group, returns void
export const notifyManagerOrderPaid = async (order: TNotifyOrder): Promise<void> => {
  if (!MANAGER_CHAT_ID) return;
  const text = [
    `✅ <b>Замовлення #${order.id} оплачено!</b>`,
    `👤 ${clientName(order)}`,
    `📱 ${order.phone ?? '—'}`,
    `💰 <b>${order.totalPrice ?? 0} ${order.currency ?? 'UAH'}</b>`,
  ].join('\n');
  await sendMessage(MANAGER_CHAT_ID, text, clientButton(order.telegramUserId));
};

// inputs order + error text, does send payment failure alert to manager group, returns void
export const notifyManagerPaymentError = async (order: TNotifyOrder, errorText: string): Promise<void> => {
  if (!MANAGER_CHAT_ID) return;
  const text = [
    `⚠️ <b>Помилка оплати замовлення #${order.id}</b>`,
    `👤 ${clientName(order)}`,
    `📱 ${order.phone ?? '—'}`,
    `💰 <b>${order.totalPrice ?? 0} ${order.currency ?? 'UAH'}</b>`,
    `\n🔴 <code>${errorText}</code>`,
  ].join('\n');
  await sendMessage(MANAGER_CHAT_ID, text, clientButton(order.telegramUserId));
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
