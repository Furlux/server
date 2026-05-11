import type { Core } from '@strapi/strapi';
import { startCleanupInterval } from './api/csv-migration/lib/job-state';

const ORDER_UID = 'api::order.order';
const CM_KEY = `configuration_content_types::${ORDER_UID}`;

type TOrderItem = { productName?: string; quantity?: number; price?: number };

// inputs items JSON, does format to readable multiline string, returns string
const buildItemsSummary = (items: unknown): string => {
  if (!Array.isArray(items) || items.length === 0) return '—';
  return (items as TOrderItem[])
    .map((item) => `• ${item.quantity ?? 1}x ${item.productName ?? 'Товар'}${item.price != null ? ` — ${item.price}` : ''}`)
    .join('\n');
};

// inputs strapi + order record, does update label and itemsSummary via raw db query, returns void
const syncComputedFields = async (
  strapi: Core.Strapi,
  order: { id: number; firstName?: string; lastName?: string; items?: unknown; label?: string | null },
) => {
  const label = `#${order.id} — ${order.firstName ?? ''} ${order.lastName ?? ''}`.trim();
  const itemsSummary = buildItemsSummary(order.items);
  await strapi.db.query(ORDER_UID).update({ where: { id: order.id }, data: { label, itemsSummary } });
};

// inputs strapi, does backfill label+itemsSummary for orders where label is null, returns count
const backfillOrders = async (strapi: Core.Strapi): Promise<number> => {
  const orders = await strapi.db.query(ORDER_UID).findMany({
    where: { label: { $null: true } },
    select: ['id', 'firstName', 'lastName', 'items'],
  });
  for (const order of orders) {
    await syncComputedFields(strapi, order as Parameters<typeof syncComputedFields>[1]);
  }
  return orders.length;
};

// inputs strapi, does write content manager admin config for orders to plugin store, returns void
const configureOrderAdminView = async (strapi: Core.Strapi) => {
  const pluginStore = strapi.store({ environment: '', type: 'plugin', name: 'content-manager' });

  const ro = (label: string) => ({ edit: { label, description: '', placeholder: '', visible: true, editable: false }, list: { label, searchable: false, sortable: false } });
  const rw = (label: string, searchable = true) => ({ edit: { label, description: '', placeholder: '', visible: true, editable: true }, list: { label, searchable, sortable: searchable } });
  const hidden = (label: string) => ({ edit: { label, description: '', placeholder: '', visible: false, editable: false }, list: { label, searchable: false, sortable: false } });

  const value = {
    uid: ORDER_UID,
    settings: {
      bulkable: true,
      filterable: true,
      searchable: true,
      pageSize: 25,
      mainField: 'label',
      defaultSortBy: 'id',
      defaultSortOrder: 'DESC',
    },
    metadatas: {
      id: { edit: {}, list: { label: 'ID', searchable: true, sortable: true } },
      label: ro('Замовлення'),
      itemsSummary: ro('Товари'),
      orderStatus: rw('Статус замовлення'),
      paymentStatus: rw('Статус оплати'),
      firstName: rw('Ім\'я'),
      lastName: rw('Прізвище'),
      phone: rw('Телефон'),
      city: rw('Місто'),
      deliveryMethod: rw('Доставка'),
      warehouseNumber: rw('Відділення'),
      streetAddress: rw('Адреса'),
      email: rw('Email'),
      comment: rw('Коментар'),
      totalPrice: ro('Сума'),
      currency: ro('Валюта'),
      telegramUserId: ro('Telegram ID'),
      monoInvoiceId: ro('Invoice ID'),
      items: hidden('items (JSON)'),
      cityRef: hidden('cityRef'),
      createdAt: { edit: { label: 'createdAt', visible: false, editable: false }, list: { label: 'createdAt', searchable: true, sortable: true } },
      updatedAt: { edit: { label: 'updatedAt', visible: false, editable: false }, list: { label: 'updatedAt', searchable: true, sortable: true } },
      createdBy: { edit: { label: 'createdBy', visible: false, editable: false, mainField: 'firstname' }, list: { label: 'createdBy', searchable: true, sortable: true } },
      updatedBy: { edit: { label: 'updatedBy', visible: false, editable: false, mainField: 'firstname' }, list: { label: 'updatedBy', searchable: true, sortable: true } },
      documentId: { edit: {}, list: { label: 'documentId', searchable: true, sortable: true } },
    },
    layouts: {
      list: ['label', 'orderStatus', 'paymentStatus', 'totalPrice', 'createdAt'],
      edit: [
        [{ name: 'label', size: 8 }, { name: 'totalPrice', size: 2 }, { name: 'currency', size: 2 }],
        [{ name: 'orderStatus', size: 6 }, { name: 'paymentStatus', size: 6 }],
        [{ name: 'itemsSummary', size: 12 }],
        [{ name: 'firstName', size: 6 }, { name: 'lastName', size: 6 }],
        [{ name: 'phone', size: 6 }, { name: 'city', size: 6 }],
        [{ name: 'deliveryMethod', size: 6 }, { name: 'warehouseNumber', size: 6 }],
        [{ name: 'streetAddress', size: 6 }, { name: 'email', size: 6 }],
        [{ name: 'comment', size: 12 }],
        [{ name: 'telegramUserId', size: 4 }, { name: 'monoInvoiceId', size: 8 }],
      ],
    },
  };

  await pluginStore.set({ key: CM_KEY, value });
};

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await configureOrderAdminView(strapi);

    const count = await backfillOrders(strapi);
    if (count > 0) {
      strapi.log.info(`Backfilled label/itemsSummary for ${count} existing orders`);
    }

    startCleanupInterval();
  },
};
