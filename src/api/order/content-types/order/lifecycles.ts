type TOrderItem = {
  productName?: string;
  quantity?: number;
  price?: number;
};

// inputs items JSON array, does format to human-readable string, returns string
const buildItemsSummary = (items: unknown): string => {
  if (!Array.isArray(items) || items.length === 0) return '—';

  return (items as TOrderItem[])
    .map((item) => {
      const name = item.productName ?? 'Товар';
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

export default {
  async afterCreate(event: { result: Parameters<typeof updateComputedFields>[0] }) {
    await updateComputedFields(event.result);
  },

  async afterUpdate(event: { result: Parameters<typeof updateComputedFields>[0]; params: { data?: Record<string, unknown> } }) {
    // Skip if this update was triggered by updateComputedFields itself
    if ('label' in (event.params.data ?? {}) || 'itemsSummary' in (event.params.data ?? {})) return;
    await updateComputedFields(event.result);
  },
};
