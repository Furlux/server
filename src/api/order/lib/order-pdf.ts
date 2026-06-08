import path from 'node:path';
import type { TOrderSummary } from './order-summary';

// pdfmake 0.3 server singleton. No bundled type declarations, hence require (same pattern as heic-convert).
const pdfmake = require('pdfmake');

// Roboto ships with pdfmake and covers Ukrainian Cyrillic (і ї є ґ, №). Resolved from the installed
// package so it works in both `strapi develop` (src) and production (dist) without copying assets.
const FONTS_DIR = path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto');

const ACCENT = '#4945ff';
const MUTED = '#555555';
type Margin = [number, number, number, number];

let fontsReady = false;

// inputs none, does register Roboto and lock pdfmake file/url access once, returns void
const ensureFonts = (): void => {
  if (fontsReady) return;
  pdfmake.setFonts({
    Roboto: {
      normal: path.join(FONTS_DIR, 'Roboto-Regular.ttf'),
      bold: path.join(FONTS_DIR, 'Roboto-Medium.ttf'),
      italics: path.join(FONTS_DIR, 'Roboto-Italic.ttf'),
      bolditalics: path.join(FONTS_DIR, 'Roboto-MediumItalic.ttf'),
    },
  });
  pdfmake.setLocalAccessPolicy((p: string) => p.startsWith(FONTS_DIR));
  pdfmake.setUrlAccessPolicy(() => false);
  fontsReady = true;
};

// inputs label + value, does build a two-column info row, returns pdfmake node or null (skipped when empty)
const infoRow = (label: string, value: string) =>
  value
    ? {
        columns: [
          { text: label, width: 95, color: MUTED },
          { text: value, width: '*' },
        ],
        margin: [0, 1, 0, 1] as Margin,
      }
    : null;

// inputs order summary, does build the pdfmake document definition, returns docDefinition
const buildDocDefinition = (s: TOrderSummary) => {
  const itemRows = s.items.map((item) => [
    item.productName,
    { text: String(item.quantity), alignment: 'right' },
    { text: `${item.price} ${s.currency}`, alignment: 'right' },
    { text: `${item.sum} ${s.currency}`, alignment: 'right' },
  ]);

  const tableBody = [
    [
      { text: 'Товар', bold: true },
      { text: 'К-сть', bold: true, alignment: 'right' },
      { text: 'Ціна', bold: true, alignment: 'right' },
      { text: 'Сума', bold: true, alignment: 'right' },
    ],
    ...itemRows,
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40] as Margin,
    content: [
      { text: `Замовлення ${s.orderNumber}`, fontSize: 20, bold: true, color: ACCENT },
      s.createdAtText ? { text: s.createdAtText, color: MUTED, margin: [0, 2, 0, 0] as Margin } : null,

      { text: 'Клієнт', fontSize: 13, bold: true, margin: [0, 14, 0, 4] as Margin },
      infoRow("Ім'я:", s.clientName),
      infoRow('Телефон:', s.phone),
      infoRow('Email:', s.email),

      { text: 'Доставка', fontSize: 13, bold: true, margin: [0, 12, 0, 4] as Margin },
      infoRow('Місто:', s.city),
      infoRow('Спосіб:', s.deliveryLabel),

      { text: 'Товари', fontSize: 13, bold: true, margin: [0, 12, 0, 4] as Margin },
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'], body: tableBody },
        layout: 'lightHorizontalLines',
      },
      {
        text: `Разом: ${s.total} ${s.currency}`,
        fontSize: 14,
        bold: true,
        alignment: 'right',
        margin: [0, 10, 0, 0] as Margin,
      },

      s.orderStatusLabel || s.paymentStatusLabel
        ? { text: 'Статус', fontSize: 13, bold: true, margin: [0, 12, 0, 4] as Margin }
        : null,
      infoRow('Замовлення:', s.orderStatusLabel),
      infoRow('Оплата:', s.paymentStatusLabel),

      s.comment ? { text: 'Коментар', fontSize: 13, bold: true, margin: [0, 12, 0, 4] as Margin } : null,
      s.comment ? { text: s.comment } : null,
    ].filter(Boolean),
    defaultStyle: { font: 'Roboto', fontSize: 11 },
  };
};

// inputs order summary, does render the PDF document, returns Promise of the PDF buffer
export const buildOrderPdf = async (summary: TOrderSummary): Promise<Buffer> => {
  ensureFonts();
  const doc = pdfmake.createPdf(buildDocDefinition(summary));
  return doc.getBuffer();
};
