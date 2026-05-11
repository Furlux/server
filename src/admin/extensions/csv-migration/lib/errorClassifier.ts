export type TErrorCategory = {
  readonly title: string;
  readonly hint: string;
};

// inputs raw error string, does match known patterns, returns category title + hint
export const classifyError = (raw: string): TErrorCategory => {
  if (/must be unique/i.test(raw)) {
    return {
      title: 'Конфлікт унікального поля (артикул або slug вже існує)',
      hint: 'У БД вже є товар з варіантом цього артикулу (інший регістр / латиниця замість кирилиці). Знайдіть його в Content Manager і відредагуйте дані вручну.',
    };
  }
  if (/ENOENT/i.test(raw)) {
    return {
      title: 'Назва файлу в Drive містить недопустимі символи',
      hint: 'У назві Drive-файлу є "/", "\\" або ":". Перейменуйте файл у Drive, потім додайте його через панель "Google Drive" на сторінці товару.',
    };
  }
  if (/Gateway Time-out|presigned URL/i.test(raw)) {
    return {
      title: 'Тимчасова помилка сервісу зберігання Strapi',
      hint: 'Це не баг даних — просто повторіть завантаження вручну через панель "Google Drive" на сторінці товару. Зазвичай проходить з другого разу.',
    };
  }
  if (/Drive download failed: 4\d{2}/i.test(raw)) {
    return {
      title: 'Drive відмовив у завантаженні файлу',
      hint: 'Файл закритий, видалений, або власник обмежив доступ. Відкрийте доступ "Anyone with the link" у Drive і повторіть через панель.',
    };
  }
  if (/Not an image/i.test(raw)) {
    return {
      title: 'Файл не є зображенням',
      hint: 'Drive повернув HTML-сторінку замість картинки — частіше за все через закритий доступ. Перевірте права доступу до файлу.',
    };
  }
  if (/Невірний формат Google Drive URL/i.test(raw)) {
    return {
      title: 'Неправильний формат Drive-посилання',
      hint: 'У колонці "Для Михаила" має бути URL вигляду https://drive.google.com/file/d/... Виправте у CSV.',
    };
  }
  if (/Товар не знайдено/i.test(raw)) {
    return {
      title: 'Товар зник між створенням і прикріпленням фото',
      hint: 'Дуже рідкісне race-condition. Перевірте товар вручну в Content Manager.',
    };
  }
  return {
    title: 'Невідома помилка',
    hint: 'Перевірте деталі нижче. Можливо є сенс додати товар вручну.',
  };
};

// inputs article number, does build Strapi admin URL with filter, returns string
export const buildAdminFilterUrl = (article: string): string => {
  const encoded = encodeURIComponent(article);
  return `/admin/content-manager/collection-types/api::product.product?filters[$and][0][articleNumber][$containsi]=${encoded}&page=1&pageSize=10`;
};
