import {
  notifyManagerNewOrder,
  notifyCustomerStatusChanged,
  notifyCustomerOrderReceived,
  notifyCustomerPaymentPaid,
} from '../../lib/notify';
import { variantText } from '../../lib/order-summary';

type TOrderItem = {
  productName?: string;
  quantity?: number;
  price?: number;
  variantCode?: string | null;
  variantLabel?: string | null;
};

// inputs items JSON array, does format to human-readable string (with colour/variant), returns string
const buildItemsSummary = (items: unknown): string => {
  if (!Array.isArray(items) || items.length === 0) return '—';

  return (items as TOrderItem[])
    .map((item) => {
      const baseName = item.productName ?? 'Товар';
      const variant = variantText(item);
      const name = variant ? `${baseName} · ${variant}` : baseName;
      const qty = item.quantity ?? 1;
      const price = item.price != null ? ` — ${item.price}` : '';
      return `• ${qty}x ${name}${price}`;
    })
    .join('\n');
};

// inputs order result, does compute label and itemsSummary and update record via db query, returns void
const updateComputedFields = async (result: {
  id: number;
  firstName?: string;
  lastName?: string;
  items?: unknown;
}) => {
  const label = `#${result.id} — ${result.firstName ?? ''} ${result.lastName ?? ''}`.trim();
  const itemsSummary = buildItemsSummary(result.items);

  await strapi.db.query('api::order.order').update({
    where: { id: result.id },
    data: { label, itemsSummary },
  });
};

// inputs order id, does fetch full order record including telegramUserId, returns order or null
const fetchFullOrder = (id: number) =>
  strapi.db.query('api::order.order').findOne({ where: { id } });

export default {
  async afterCreate(event: { result: Parameters<typeof updateComputedFields>[0] }) {
    await updateComputedFields(event.result);
    const fullOrder = await fetchFullOrder(event.result.id);
    const order = (fullOrder ?? event.result) as any;
    await notifyManagerNewOrder(order);
    await notifyCustomerOrderReceived(order);
  },

  async afterUpdate(event: { result: Parameters<typeof updateComputedFields>[0]; params: { data?: Record<string, unknown> } }) {
    const data = event.params.data ?? {};

    // Skip self-triggered computed-field writes (label/itemsSummary via raw db.query)
    if ('label' in data || 'itemsSummary' in data) {
      return;
    }

    await updateComputedFields(event.result);

    const fullOrder = await fetchFullOrder(event.result.id);
    const order = (fullOrder ?? event.result) as any;

    // Payment marked paid (manager-manual or Mono webhook) → stock decrement + DMs (idempotent)
    if (data.paymentStatus === 'paid') {
      await (strapi.service('api::order.order') as any).applyPaidSideEffects(order);
      await notifyCustomerPaymentPaid(order);
    }

    // Order status changed → notify customer
    if (typeof data.orderStatus === 'string') {
      await notifyCustomerStatusChanged(order, data.orderStatus);
    }
  },
};
