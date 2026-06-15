import ExcelJS from 'exceljs';
import type { TOrderSummary } from './order-summary';

const ACCENT = 'FF4945FF';
const MUTED = 'FF777777';
const HEADER_BG = 'FFF0F0F5';

// inputs order summary, does render the order as an .xlsx workbook, returns Promise of the buffer
export const buildOrderExcel = async (s: TOrderSummary): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Furlux';
  const ws = wb.addWorksheet('Замовлення');

  ws.columns = [{ width: 42 }, { width: 28 }, { width: 10 }, { width: 14 }, { width: 14 }];

  const section = (label: string) => {
    const r = ws.addRow([label]);
    r.font = { bold: true, size: 12 };
  };
  const kv = (key: string, value: string) => {
    if (!value) return;
    const r = ws.addRow([key, value]);
    r.getCell(1).font = { color: { argb: MUTED } };
  };

  const title = ws.addRow([`Замовлення ${s.orderNumber}`]);
  title.font = { bold: true, size: 16, color: { argb: ACCENT } };
  if (s.createdAtText) {
    ws.addRow([s.createdAtText]).getCell(1).font = { color: { argb: MUTED } };
  }
  ws.addRow([]);

  section('Клієнт');
  kv('Ім\'я', s.clientName);
  kv('Телефон', s.phone);
  kv('Email', s.email);
  ws.addRow([]);

  section('Доставка');
  kv('Місто', s.city);
  kv('Спосіб', s.deliveryLabel);
  ws.addRow([]);

  section('Товари');
  const header = ws.addRow(['Модель', 'Колір', 'К-сть', `Ціна, ${s.currency}`, `Сума, ${s.currency}`]);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  });

  for (const item of s.items) {
    const r = ws.addRow([item.productName, item.variant || '—', item.quantity, item.price, item.sum]);
    r.getCell(4).numFmt = '#,##0';
    r.getCell(5).numFmt = '#,##0';
  }

  const totalRow = ws.addRow(['', '', '', `Разом, ${s.currency}`, s.total]);
  totalRow.font = { bold: true };
  totalRow.getCell(5).numFmt = '#,##0';
  ws.addRow([]);

  section('Статус');
  kv('Замовлення', s.orderStatusLabel);
  kv('Оплата', s.paymentStatusLabel);

  if (s.comment) {
    ws.addRow([]);
    section('Коментар');
    ws.addRow([s.comment]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
};
