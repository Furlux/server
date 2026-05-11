import React from 'react';

const tableCell: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #eaeaef',
  fontSize: 12,
  verticalAlign: 'top',
};

const tableHeader: React.CSSProperties = {
  ...tableCell,
  background: '#f6f6f9',
  fontWeight: 600,
  color: '#32324d',
};

const sectionTitle: React.CSSProperties = {
  margin: '14px 0 6px',
  fontSize: 13,
  fontWeight: 600,
  color: '#32324d',
};

const paragraph: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 12,
  color: '#32324d',
  lineHeight: 1.5,
};

const muted: React.CSSProperties = {
  ...paragraph,
  color: '#666',
};

// inputs nothing, does render collapsible help block explaining Skip/Update modes, returns JSX
const ModeHelp: React.FC = () => (
  <details
    style={{
      border: '1px solid #eaeaef',
      borderRadius: 6,
      padding: '10px 14px',
      background: '#fafafb',
    }}
  >
    <summary
      style={{
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: '#4945ff',
        userSelect: 'none',
      }}
    >
      Як це працює? (детальне пояснення)
    </summary>

    <div style={{ marginTop: 12 }}>
      <p style={paragraph}>
        Налаштування <b>Skip / Update</b> діють <b>тільки коли артикул з CSV вже існує в Strapi</b>.
        На нові продукти вони ніяк не впливають — нові завжди створюються.
      </p>

      <table style={{ borderCollapse: 'collapse', marginTop: 8, width: '100%' }}>
        <thead>
          <tr>
            <th style={tableHeader}>Артикул у БД</th>
            <th style={tableHeader}>Skip</th>
            <th style={tableHeader}>Update</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tableCell}><b>Нема</b> (новий)</td>
            <td style={tableCell}>CREATE + фото з Drive</td>
            <td style={tableCell}>CREATE + фото з Drive</td>
          </tr>
          <tr>
            <td style={tableCell}><b>Є</b> (існує)</td>
            <td style={tableCell}>Нічого не робимо</td>
            <td style={tableCell}>UPDATE текстових полів, фото не чіпаємо</td>
          </tr>
        </tbody>
      </table>

      <p style={sectionTitle}>Skip — за замовчуванням</p>
      <p style={paragraph}>Логіка: «якщо вже є в БД — не чіпай».</p>
      <p style={muted}>Корисний коли:</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li>Додаєте свіжі товари і боїтесь зламати існуючі</li>
        <li>Добиваєте пропущені артикули після попередньої міграції</li>
        <li>Хочете уникнути затирання ручних правок (опис, додані вручну фото, тощо)</li>
      </ul>

      <p style={sectionTitle}>Update — режим оновлення</p>
      <p style={paragraph}>Логіка: «якщо вже є — перезапиши текстові поля даними з CSV».</p>

      <p style={muted}><b>Що перезаписується:</b></p>
      <p style={{ ...muted, margin: '0 0 6px', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
        title, slug, price, currency, stockQuantity, available, isNew, isBrand, hasClipon,
        productStatus, photoFormat, category, gender, frameType, frameShape, lensType,
        supplierCode, variants
      </p>

      <p style={muted}><b>Що НЕ чіпається:</b></p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li><b>images</b> — фотки залишаються як були</li>
        <li><b>description</b> — опис не в CSV</li>
        <li>Будь-яке інше поле, якого нема в payload</li>
      </ul>

      <p style={{ ...muted, padding: 8, background: '#fff5e6', border: '1px solid #ffd590', borderRadius: 4 }}>
        ⚠️ <b>Нюанс по variants:</b> при Update масив варіантів повністю замінюється.
        Якщо в CSV з&apos;явився новий код кольору замість старого — старий зникне.
      </p>

      <p style={muted}>Корисний коли:</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li>Клієнт прислав оновлений прайс з новими цінами/залишками — треба прокачати весь каталог</li>
        <li>Поміняли категорію або стать у частини товарів</li>
        <li>Виявили що в попередній міграції щось було неправильно розпарсено і треба переробити</li>
      </ul>

      <p style={sectionTitle}>Поради</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: 0 }}>
        <li>За замовчуванням завжди обирайте <b>Skip</b> — найбезпечніше</li>
        <li>Перед <b>Update</b> спочатку прогоніть з увімкненим <b>Dry-run</b> — щоб переглянути в логах що саме буде оновлено, без реальних змін</li>
      </ul>
    </div>
  </details>
);

export default ModeHelp;
