// Single source of truth for order text. Feeds the Telegram manager notifications
// (via {@link buildItemsText} and {@link clientName}) and the admin PDF (via
// {@link buildOrderSummary}). Pure module - no env, no strapi, no Node APIs.

export type TOrderItem = { productName?: string | null; quantity?: number | null; price?: number | null; variantCode?: string | null; variantLabel?: string | null };

export type TOrderLike = {
  id?: number | string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  items?: unknown;
  city?: string | null;
  deliveryMethod?: string | null;
  warehouseNumber?: string | null;
  streetAddress?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  comment?: string | null;
  createdAt?: string | Date | null;
};

export type TOrderSummaryItem = { quantity: number; productName: string; variant: string; price: number; sum: number };

export type TOrderSummary = {
  orderNumber: string;
  clientName: string;
  phone: string;
  email: string;
  city: string;
  deliveryLabel: string;
  items: TOrderSummaryItem[];
  total: number;
  currency: string;
  orderStatusLabel: string;
  paymentStatusLabel: string;
  comment: string;
  createdAtText: string;
};

const DEFAULT_CURRENCY = 'UAH';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
};

const DELIVERY_LABELS: Record<string, string> = {
  'nova-poshta-warehouse': 'Nova Poshta (branch)',
  'nova-poshta-address': 'Nova Poshta (address delivery)',
};

// inputs unknown value, does coerce to a finite number, returns number or fallback
const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// inputs items JSON, does narrow to array, returns TOrderItem[]
const toItems = (items: unknown): TOrderItem[] => (Array.isArray(items) ? (items as TOrderItem[]) : []);

// inputs order + optional fallback, does build full name, returns name or fallback. Telegram keeps the
// "Клієнт" default; the PDF passes "Client" via {@link buildOrderSummary}.
export const clientName = (order: Pick<TOrderLike, 'firstName' | 'lastName'>, fallback = 'Клієнт'): string =>
  `${order.firstName ?? ''} ${order.lastName ?? ''}`.trim() || fallback;

// inputs item, does build "Label (Code)" colour text (label or code alone when only one present), returns string ('' when none)
export const variantText = (item: Pick<TOrderItem, 'variantCode' | 'variantLabel'>): string => {
  const label = item.variantLabel?.trim();
  const code = item.variantCode?.trim();
  if (label && code) return `${label} (${code})`;
  return label || code || '';
};

// inputs item, does format one Telegram bullet line (with colour name + code), returns string. Em-dash kept to preserve the existing manager-group message format.
export const formatItemLine = (item: TOrderItem): string => {
  const variant = variantText(item);
  const name = variant ? `${item.productName ?? 'Товар'} · ${variant}` : (item.productName ?? 'Товар');
  return `• ${item.quantity ?? 1}x ${name} — ${item.price ?? 0} UAH`;
};

// inputs items JSON, does format the Telegram bullet list with a leading newline, returns string ('' when empty)
export const buildItemsText = (items: unknown): string => {
  const list = toItems(items);
  if (list.length === 0) return '';
  return '\n' + list.map(formatItemLine).join('\n');
};

// inputs order, does compose the English delivery label with warehouse/street detail, returns string
const deliveryLabel = (order: TOrderLike): string => {
  const base = DELIVERY_LABELS[order.deliveryMethod ?? ''] ?? (order.deliveryMethod ?? '');
  if (order.deliveryMethod === 'nova-poshta-warehouse' && order.warehouseNumber) {
    return `${base}, No.${order.warehouseNumber}`;
  }
  if (order.deliveryMethod === 'nova-poshta-address' && order.streetAddress) {
    return `${base}, ${order.streetAddress}`;
  }
  return base;
};

// inputs date, does format to dd.MM.yyyy HH:mm, returns string ('' when missing/invalid)
const formatDateTime = (value: TOrderLike['createdAt']): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// inputs order, does build the structured summary used by the PDF document, returns TOrderSummary
export const buildOrderSummary = (order: TOrderLike): TOrderSummary => {
  const currency = order.currency ?? DEFAULT_CURRENCY;
  const items = toItems(order.items).map((item) => {
    const quantity = toNumber(item.quantity, 1);
    const price = toNumber(item.price);
    const variant = variantText(item);
    return { quantity, productName: item.productName ?? 'Product', variant, price, sum: quantity * price };
  });
  return {
    orderNumber: `#${order.id ?? ''}`,
    clientName: clientName(order, 'Client'),
    phone: order.phone ?? '-',
    email: order.email ?? '',
    city: order.city ?? '',
    deliveryLabel: deliveryLabel(order),
    items,
    total: toNumber(order.totalPrice),
    currency,
    orderStatusLabel: ORDER_STATUS_LABELS[order.orderStatus ?? ''] ?? (order.orderStatus ?? ''),
    paymentStatusLabel: PAYMENT_STATUS_LABELS[order.paymentStatus ?? ''] ?? (order.paymentStatus ?? ''),
    comment: order.comment ?? '',
    createdAtText: formatDateTime(order.createdAt),
  };
};
