import type { TJobState, TFailedItem, TPhotoFailedItem } from './job-state';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_FAILURE_SAMPLES = 15;

type TGeminiRequest = {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    thinkingConfig?: { thinkingBudget: number };
  };
};

type TGeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

// inputs ms, does build duration string, returns formatted text
const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} с`;
  return `${Math.floor(s / 60)} хв ${s % 60} с`;
};

// inputs bucket, does format average for prompt, returns string
const fmtAvg = (b: { count: number; totalMs: number }): string => {
  if (b.count === 0) return 'n/a';
  return `${(b.totalMs / b.count).toFixed(0)}мс (${b.count} раз)`;
};

// inputs failures array, does take top N + classify count, returns prompt text
const summarizeFailures = (failed: readonly TFailedItem[]): string => {
  if (failed.length === 0) return 'Немає.';
  const sample = failed.slice(0, MAX_FAILURE_SAMPLES);
  const lines = sample.map((f) => {
    const op = f.context?.operation ?? '?';
    const name = f.context?.errorName ?? 'Error';
    return `- ${f.article} [${op}/${name}]: ${f.error.slice(0, 120)}`;
  });
  if (failed.length > MAX_FAILURE_SAMPLES) {
    lines.push(`...та ще ${failed.length - MAX_FAILURE_SAMPLES} помилок`);
  }
  return lines.join('\n');
};

// inputs photo failures, does take top N with stage info, returns prompt text
const summarizePhotoFailures = (photoFailed: readonly TPhotoFailedItem[]): string => {
  if (photoFailed.length === 0) return 'Немає.';
  const sample = photoFailed.slice(0, MAX_FAILURE_SAMPLES);
  const lines = sample.map((f) => {
    const stage = f.context?.stage ?? 'unknown';
    return `- ${f.article} [stage=${stage}]: ${f.error.slice(0, 120)}`;
  });
  if (photoFailed.length > MAX_FAILURE_SAMPLES) {
    lines.push(`...та ще ${photoFailed.length - MAX_FAILURE_SAMPLES} помилок`);
  }
  return lines.join('\n');
};

// inputs job state, does build full prompt for Gemini, returns string
const buildPrompt = (job: TJobState): string => {
  const wallClockMs = (job.finishedAt ?? Date.now()) - job.startedAt;
  return `Ти аналізуєш результат міграції товарів з CSV у Strapi CMS для українського інтернет-магазину окулярів.

Згенеруй коротке текстове резюме українською мовою для адміністратора магазину.

ВИМОГИ ДО ВІДПОВІДІ:
- 3-5 речень, до 250 слів
- Суцільний текст без буллетів, нумерації, заголовків
- Без emoji, без markdown
- Дружній, не технічний тон
- Якщо все добре — короткий позитивний вердикт + одне спостереження по швидкості
- Якщо є помилки — поясни типову причину (slug-конфлікт, недопустимі символи у назві Drive-файлу, тощо) і поради що робити далі
- Згадай таймінги тільки якщо вони показові (дуже швидко, дуже повільно, або є очевидний боттлнек)
- Не повторюй буквально цифри з блоку нижче — інтерпретуй їх

ДАНІ МІГРАЦІЇ:

Опції: режим=${job.options.mode}, dryRun=${job.options.dryRun}
Статус: ${job.status}
Загалом артикулів у CSV: ${job.total}
Створено: ${job.created}
Оновлено: ${job.updated}
Без змін (дані ідентичні існуючим): ${job.unchanged}
Пропущено: ${job.skipped}
Помилок: ${job.failed.length}
Помилок завантаження фото: ${job.photoFailed.length}
Тривалість: ${formatDuration(wallClockMs)}

Таймінги операцій (avg):
- Lookup: ${fmtAvg(job.timings.lookup)}
- Create: ${fmtAvg(job.timings.create)}
- Update: ${fmtAvg(job.timings.update)}
- Photo:  ${fmtAvg(job.timings.photo)}

Помилки створення/оновлення:
${summarizeFailures(job.failed)}

Помилки завантаження фото:
${summarizePhotoFailures(job.photoFailed)}

${job.fatalError ? `Фатальна помилка: ${job.fatalError}` : ''}

ВІДПОВІДЬ (тільки сам текст резюме, без жодних додаткових пояснень чи метаданих):`;
};

// inputs nothing, does check if Gemini integration is configured, returns boolean
export const isAiEnabled = (): boolean => Boolean(process.env.GEMINI_API_KEY);

// inputs job state, does call Gemini API with built prompt, returns summary text or throws
export const generateSummary = async (job: TJobState): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не налаштовано');
  }

  const body: TGeminiRequest = {
    contents: [{ parts: [{ text: buildPrompt(job) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await response.json()) as TGeminiResponse;
    if (data.error) {
      throw new Error(`Gemini error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error('Gemini повернув порожню відповідь');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
};
