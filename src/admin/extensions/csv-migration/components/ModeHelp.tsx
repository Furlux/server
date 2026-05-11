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
  margin: '16px 0 6px',
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

const noteBlock: React.CSSProperties = {
  ...muted,
  padding: 10,
  background: '#fff5e6',
  border: '1px solid #ffd590',
  borderRadius: 4,
  marginTop: 8,
};

// inputs nothing, does render collapsible help block explaining all migration options, returns JSX
const ModeHelp: React.FC = () => (
  <details
    style={{
      border: '1px solid #eaeaef',
      borderRadius: 6,
      padding: '12px 16px',
      background: '#fafafb',
    }}
  >
    <summary
      style={{
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        color: '#4945ff',
        userSelect: 'none',
      }}
    >
      Як це працює? (детальне пояснення)
    </summary>

    <div style={{ marginTop: 14 }}>
      <p style={sectionTitle}>Загальна логіка</p>
      <p style={paragraph}>
        Система читає CSV, групує рядки по <b>articleNumber</b>, і для кожного артикулу робить запит в базу:
        «чи є вже продукт з таким артикулом?». Далі поведінка залежить від вибраного режиму та того, чи дійсно артикул існує.
      </p>

      <p style={sectionTitle}>Skip vs Update — таблиця</p>
      <p style={muted}>
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

      <p style={noteBlock}>
        ⚠️ <b>Нюанс по variants:</b> при Update масив варіантів повністю замінюється.
        Якщо в CSV з&apos;явився новий код кольору замість старого — старий зникне.
      </p>

      <p style={muted}>Корисний коли:</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li>Клієнт прислав оновлений прайс з новими цінами/залишками — треба прокачати весь каталог</li>
        <li>Поміняли категорію або стать у частини товарів</li>
        <li>Виявили що в попередній міграції щось було неправильно розпарсено і треба переробити</li>
      </ul>

      <p style={sectionTitle}>Що з фото</p>
      <p style={paragraph}>
        Фото з Google Drive (колонка <b>«Для Михаила»</b>) завантажуються
        <b> тільки для нових продуктів</b>. На існуючих продуктах фото ніколи не торкаються —
        ні в Skip, ні в Update.
      </p>
      <p style={muted}>
        Це зроблено навмисно, бо сервіс завантаження <b>додає</b> фото в масив, а не замінює.
        Тому повторний запуск Update міг би створити дублі. Якщо потрібно перезалити фото —
        видаліть його вручну на сторінці товару і додайте через існуючу панель «Google Drive» збоку.
      </p>

      <p style={sectionTitle}>Dry-run — холостий запуск</p>
      <p style={paragraph}>
        Чекбокс <b>Dry-run</b> — це симуляція міграції <b>без жодних змін у БД</b>.
        Корисно щоб перевірити CSV і подивитись що саме станеться, перед справжнім запуском.
      </p>
      <p style={muted}>Під час Dry-run виконується:</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li>✅ CSV парситься, рядки групуються по артикулу</li>
        <li>✅ Будується повний payload для кожного продукту (title, slug, price, variants...)</li>
        <li>✅ Перевіряється чи існує продукт у БД</li>
        <li>❌ Жодних CREATE / UPDATE не виконується</li>
        <li>❌ Фото з Drive не завантажуються</li>
      </ul>
      <p style={muted}>
        У логах буде <code style={{ background: '#eaeaef', padding: '1px 4px', borderRadius: 3 }}>DRY-RUN</code> замість
        <code style={{ background: '#eaeaef', padding: '1px 4px', borderRadius: 3, marginLeft: 4 }}>CREATED</code>
        / <code style={{ background: '#eaeaef', padding: '1px 4px', borderRadius: 3 }}>UPDATED</code>.
        Лічильники <i>Created / Updated / Skipped</i> залишаться нульовими.
      </p>
      <p style={muted}>Корисний коли:</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: '0 0 6px' }}>
        <li>Хочете перевірити CSV на коректність до того, як міняти прод</li>
        <li>Бачите скільки артикулів буде створено, а скільки оновлено</li>
        <li>Перевіряєте правильно чи розпарсилися назви, варіанти, категорії</li>
        <li>Особливо <b>перед Update</b> — щоб упевнитись, що ви оновлюєте те, що думаєте</li>
      </ul>

      <p style={sectionTitle}>Поради</p>
      <ul style={{ ...muted, paddingLeft: 18, margin: 0 }}>
        <li>За замовчуванням завжди обирайте <b>Skip</b> — найбезпечніше</li>
        <li>Перед <b>Update</b> спочатку прогоніть з увімкненим <b>Dry-run</b></li>
        <li>Якщо в логах багато <code style={{ background: '#eaeaef', padding: '1px 4px', borderRadius: 3 }}>FAIL</code> —
          скачайте JSON-звіт і подивіться що саме поламалось</li>
      </ul>
    </div>
  </details>
);

export default ModeHelp;
